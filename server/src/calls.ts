import { activePrompt, getDb, newId, saveDb, type CallRecord, type Speaker } from './db.ts';
import { publish } from './events.ts';
import { getProfileTraits } from './twilio-api.ts';

type NewCallFields = Pick<CallRecord, 'channel' | 'from' | 'to'> &
  Partial<Pick<CallRecord, 'callSid' | 'conversationId' | 'profileId' | 'presetId'>>;

/** Creates an active call record, persists it and announces it to the browser. */
export function startCall(fields: NewCallFields): CallRecord {
  const call: CallRecord = {
    id: newId(),
    status: 'active',
    startedAt: new Date().toISOString(),
    promptVersionId: activePrompt().id,
    transcript: [],
    toolCalls: [],
    latency: [],
    intelligence: [],
    ...fields,
  };
  getDb().calls.push(call);
  saveDb();
  publish({ type: 'call.started', callId: call.id });
  return call;
}

/** Marks a call ended and records its duration. No-op if it already ended. */
export function endCallRecord(call: CallRecord, durationSec?: number): void {
  if (call.status === 'ended') return;
  call.status = 'ended';
  call.endedAt = new Date().toISOString();
  call.durationSec = durationSec ?? Math.round((Date.parse(call.endedAt) - Date.parse(call.startedAt)) / 1000);
  saveDb();
  publish({ type: 'call.ended', callId: call.id });
}

/** Appends one transcript line and streams it to the browser. */
export function appendTranscript(call: CallRecord, speaker: Speaker, text: string, interrupted?: boolean): void {
  call.transcript.push({ at: new Date().toISOString(), speaker, text, ...(interrupted && { interrupted }) });
  saveDb();
  publish({ type: 'transcript', callId: call.id, speaker, text, ...(interrupted && { interrupted }) });
}

/** Records a tool call made by the agent during this call. */
export function recordToolCall(call: CallRecord, name: string, args: unknown, result: unknown): void {
  call.toolCalls.push({ at: new Date().toISOString(), name, args, result });
  saveDb();
  publish({ type: 'tool', callId: call.id, name, args });
}

/** Re-reads the caller's Memory profile onto the call record and streams it to the browser. */
export async function refreshProfile(call: CallRecord): Promise<void> {
  if (!call.profileId) return;
  try {
    call.profileTraits = await getProfileTraits(call.profileId);
    saveDb();
    publish({ type: 'profile', callId: call.id, traits: call.profileTraits });
  } catch (error) {
    console.warn(`Profile fetch failed for ${call.profileId}:`, error);
  }
}
