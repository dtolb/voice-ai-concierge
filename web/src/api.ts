import { useEffect, useRef } from 'react';

export interface TranscriptLine {
  at: string;
  speaker: 'caller' | 'agent' | 'system';
  text: string;
  interrupted?: boolean;
}

export interface IntelligenceResult {
  at: string;
  operator: string;
  operatorId: string;
  outputFormat: string;
  trigger: string;
  result: unknown;
}

export interface CallSummary {
  id: string;
  channel: 'voice' | 'sms';
  callSid?: string;
  from: string;
  status: 'active' | 'ended';
  startedAt: string;
  durationSec?: number;
  turns: number;
  sentiment?: { label?: string };
  purchaseInterest?: string;
}

export interface CallDetail extends Omit<CallSummary, 'turns' | 'sentiment' | 'purchaseInterest'> {
  to: string;
  conversationId?: string;
  profileId?: string;
  endedAt?: string;
  transcript: TranscriptLine[];
  toolCalls: { at: string; name: string; args: unknown; result: unknown }[];
  latency: { at: string; firstTokenMs: number; fullResponseMs: number }[];
  intelligence: IntelligenceResult[];
  profileTraits?: Record<string, Record<string, unknown>>;
  insightsUrl?: string;
  prompt?: PromptVersion;
  preset?: RelayPreset;
}

export interface PromptVersion {
  id: string;
  createdAt: string;
  label: string;
  text: string;
}

export type RelayOptions = Record<string, string | number | boolean | undefined>;

export interface RelayPreset {
  id: string;
  name: string;
  updatedAt: string;
  options: RelayOptions;
}

export interface AppConfig {
  phoneNumber: string;
  accountSid: string;
  model: string;
  memoryStoreId: string;
  conversationConfigurationId: string;
  intelligenceConfigurationId: string;
  leadOperatorId: string;
  publicHost: string;
}

export type LiveEvent =
  | { type: 'call.started' | 'call.updated' | 'call.ended'; callId: string }
  | { type: 'transcript'; callId: string; speaker: string; text: string; interrupted?: boolean }
  | { type: 'agent.token'; callId: string; token: string }
  | { type: 'intelligence'; callId: string; operator: string; result: unknown; trigger: string }
  | { type: 'profile'; callId: string; traits: Record<string, unknown> }
  | { type: 'tool'; callId: string; name: string; args: unknown };

/** Fetches JSON from the app's API. Throws on a non-2xx status. */
export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? 'GET',
    ...(init?.body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init.body),
    }),
  });
  if (!response.ok) throw new Error(`${path} -> ${response.status}`);
  return (await response.json()) as T;
}

/** Subscribes to the server's live event stream for the component's lifetime. */
export function useLiveEvents(onEvent: (event: LiveEvent) => void): void {
  const handler = useRef(onEvent);
  handler.current = onEvent;
  useEffect(() => {
    const source = new EventSource('/api/events');
    source.onmessage = message => handler.current(JSON.parse(message.data) as LiveEvent);
    return () => source.close();
  }, []);
}

/** Formats an ISO timestamp as a local date and time. */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** Formats seconds as m:ss. */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) return '—';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
