import type { AgentInputItem } from '@openai/agents';
import { buildAgent, runTurn } from '../server/src/agent.ts';
import { DEFAULT_PROMPT } from '../server/src/prompt.ts';
import { speakZipCodes } from '../server/src/speech.ts';

const calls: { name: string; args: unknown; result: unknown }[] = [];
const ctx = {
  profileId: undefined,
  callSid: 'CAsmoke',
  phone: '+15125550142',
  channel: 'voice' as const,
  onEndCall: () => console.log('>> end_call fired'),
  onToolCall: (name: string, args: unknown, result: unknown) => calls.push({ name, args, result }),
};
const caller = [
  "Hi, my furnace is about twenty years old and it keeps breaking down. I think I need to replace it.",
  "It's Jordan Rivera.",
  "Sure, it's 4512 Ridgeview Drive, Austin, Texas 78731.",
  "Yes, that's right.",
  "No repairs lately, but can someone come out Tuesday morning for an estimate?",
  "No, that's everything. Thanks, bye.",
];
const history: AgentInputItem[] = [];
for (const line of caller) {
  history.push({ type: 'message', role: 'user', content: line });
  const started = performance.now();
  const reply = await runTurn(buildAgent(DEFAULT_PROMPT, undefined, undefined, ctx, 'voice'), history);
  history.push({ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: reply }] });
  console.log(`CALLER: ${line}\nSKY (${Math.round(performance.now() - started)}ms): ${speakZipCodes(reply)}\n`);
}
console.log('TOOL CALLS:', JSON.stringify(calls.map(c => ({ name: c.name, args: c.args })), null, 2));
