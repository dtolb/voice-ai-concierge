import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { RelayPreset } from './twiml.ts';

export type Speaker = 'caller' | 'agent' | 'system';

export interface TranscriptLine {
  at: string;
  speaker: Speaker;
  text: string;
  interrupted?: boolean;
}

export interface ToolCallRecord {
  at: string;
  name: string;
  args: unknown;
  result: unknown;
}

export interface TurnLatency {
  at: string;
  firstTokenMs: number;
  fullResponseMs: number;
}

export interface IntelligenceResult {
  at: string;
  operator: string;
  operatorId: string;
  outputFormat: string;
  trigger: string;
  result: unknown;
}

export interface CallRecord {
  id: string;
  channel: 'voice' | 'sms';
  callSid?: string;
  conversationId?: string;
  profileId?: string;
  from: string;
  to: string;
  status: 'active' | 'ended';
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  promptVersionId: string;
  presetId?: string;
  twiml?: string;
  transcript: TranscriptLine[];
  toolCalls: ToolCallRecord[];
  latency: TurnLatency[];
  intelligence: IntelligenceResult[];
  profileTraits?: Record<string, unknown>;
}

export interface PromptVersion {
  id: string;
  createdAt: string;
  label: string;
  text: string;
}

export interface Database {
  calls: CallRecord[];
  prompts: PromptVersion[];
  activePromptId: string;
  presets: RelayPreset[];
  activePresetId: string;
}

const DB_PATH = resolve(process.env.DATABASE_PATH ?? 'data/database.json');

let db: Database;

/** Loads database.json from disk, seeding it with `seed()` when absent. */
export function loadDb(seed: () => Database): Database {
  if (existsSync(DB_PATH)) {
    db = JSON.parse(readFileSync(DB_PATH, 'utf8')) as Database;
  } else {
    db = seed();
    saveDb();
  }
  return db;
}

/** Returns the in-memory database. */
export function getDb(): Database {
  return db;
}

/** Writes the database to disk atomically. */
export function saveDb(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2));
  renameSync(tmp, DB_PATH);
}

/** Returns a new random id. */
export function newId(): string {
  return randomUUID();
}

/** Finds a call by its record id, CallSid or Orchestrator conversation id. */
export function findCall(key: { id?: string; callSid?: string; conversationId?: string }): CallRecord | undefined {
  return db.calls.find(
    c =>
      (key.id !== undefined && c.id === key.id) ||
      (key.callSid !== undefined && c.callSid === key.callSid) ||
      (key.conversationId !== undefined && c.conversationId === key.conversationId)
  );
}

/** Returns the most recent call for a conversation id, preferring an active one. */
export function latestCallForConversation(conversationId: string): CallRecord | undefined {
  const matches = db.calls.filter(c => c.conversationId === conversationId);
  return matches.find(c => c.status === 'active') ?? matches.at(-1);
}

/** Returns the prompt version currently used for new calls. */
export function activePrompt(): PromptVersion {
  return db.prompts.find(p => p.id === db.activePromptId) ?? db.prompts.at(-1)!;
}

/** Returns the ConversationRelay preset currently used for new calls. */
export function activePreset(): RelayPreset {
  return db.presets.find(p => p.id === db.activePresetId) ?? db.presets[0]!;
}
