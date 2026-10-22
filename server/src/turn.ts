import type { AgentInputItem } from '@openai/agents';
import type { ConversationId, ConversationSession, TACMemoryResponse, VoiceChannel } from 'twilio-agent-connect';
import { buildAgent, runTurn, streamTurn, type TurnContext } from './agent.ts';
import { appendTranscript, recordToolCall, refreshProfile } from './calls.ts';
import { activePrompt, type CallRecord } from './db.ts';
import { publish } from './events.ts';
import { estimateSpeechMs, speakZipCodesStream } from './speech.ts';

/** Chat history per Orchestrator conversation, in OpenAI Agents SDK input format. */
const histories = new Map<string, AgentInputItem[]>();

/** One inbound utterance or text, ready for the agent. */
export interface TurnInput {
  call: CallRecord;
  conversationId: ConversationId;
  message: string;
  memory: TACMemoryResponse | undefined;
  session: ConversationSession;
  abortSignal: AbortSignal | undefined;
}

function assistantItem(text: string): AgentInputItem {
  return { type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }] };
}

function historyFor(conversationId: string): AgentInputItem[] {
  const turns = histories.get(conversationId) ?? [];
  histories.set(conversationId, turns);
  return turns;
}

/** Runs one SMS turn and returns the reply text for TAC to send. */
export async function handleSmsTurn(input: TurnInput): Promise<string> {
  const { call, conversationId, message, memory, session } = input;
  appendTranscript(call, 'caller', message);
  const turns = historyFor(conversationId);
  turns.push({ type: 'message', role: 'user', content: message });

  const ctx = turnContext(call, 'sms', () => {});
  const reply = await runTurn(buildAgent(activePrompt().text, memory, session, ctx, 'sms'), turns);
  turns.push(assistantItem(reply));
  appendTranscript(call, 'agent', reply);
  return reply;
}

/**
 * Runs one voice turn: streams the agent's reply to ConversationRelay token by token,
 * records first-token latency, and hangs up afterwards if the agent called end_call.
 */
export async function handleVoiceTurn(input: TurnInput, voice: VoiceChannel): Promise<void> {
  const { call, conversationId, message, memory, session, abortSignal } = input;
  appendTranscript(call, 'caller', message);
  const turns = historyFor(conversationId);
  turns.push({ type: 'message', role: 'user', content: message });
  if (abortSignal?.aborted) return;

  let hangUpAfterReply = false;
  const ctx = turnContext(call, 'voice', () => {
    hangUpAfterReply = true;
  });
  const agent = buildAgent(activePrompt().text, memory, session, ctx, 'voice');

  const started = performance.now();
  let firstTokenMs: number | undefined;
  const { tokens, completed } = await streamTurn(agent, turns, abortSignal);
  async function* spoken(): AsyncGenerator<string> {
    for await (const token of speakZipCodesStream(tokens)) {
      firstTokenMs ??= Math.round(performance.now() - started);
      publish({ type: 'agent.token', callId: call.id, token });
      yield token;
    }
  }
  const reply = await voice.sendStreamingResponse(conversationId, spoken(), abortSignal ? { signal: abortSignal } : undefined);
  await completed;
  if (abortSignal?.aborted) return;

  turns.push(assistantItem(reply));
  call.latency.push({
    at: new Date().toISOString(),
    firstTokenMs: firstTokenMs ?? -1,
    fullResponseMs: Math.round(performance.now() - started),
  });
  appendTranscript(call, 'agent', reply);
  if (hangUpAfterReply && call.callSid) scheduleHangUp(call, reply, voice);
}

/** Rewrites history after a barge-in so the agent remembers only what the caller actually heard. */
export function handleInterrupt(call: CallRecord | undefined, conversationId: string, heard: string | undefined): void {
  if (call && heard) appendTranscript(call, 'agent', heard, true);
  const turns = histories.get(conversationId);
  if (!turns || heard === undefined) return;
  for (let i = turns.length - 1; i >= 0; i--) {
    const item = turns[i];
    if (item?.type === 'message' && item.role === 'assistant') {
      turns[i] = assistantItem(heard);
      turns.splice(i + 1);
      return;
    }
  }
}

/** Drops a conversation's chat history once its call has ended. */
export function forgetConversation(conversationId: string): void {
  histories.delete(conversationId);
}

function turnContext(call: CallRecord, channel: 'voice' | 'sms', onEndCall: () => void): TurnContext {
  return {
    profileId: call.profileId,
    callSid: call.callSid,
    phone: call.from,
    channel,
    onEndCall,
    onToolCall: (name, args, result) => {
      recordToolCall(call, name, args, result);
      void refreshProfile(call);
    },
  };
}

function scheduleHangUp(call: CallRecord, finalReply: string, voice: VoiceChannel): void {
  const delayMs = estimateSpeechMs(finalReply) + 1500;
  appendTranscript(call, 'system', `Agent ended the call (hanging up in ${(delayMs / 1000).toFixed(1)}s, after the goodbye plays).`);
  setTimeout(() => {
    if (call.callSid) void voice.endCall(call.callSid);
  }, delayMs);
}
