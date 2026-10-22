import type { VoiceTwiMLOptionsConversationRelay } from 'twilio-agent-connect';

/** A named, saved set of ConversationRelay attributes edited in the TwiML builder. */
export interface RelayPreset {
  id: string;
  name: string;
  updatedAt: string;
  options: VoiceTwiMLOptionsConversationRelay;
}

/** Attributes the builder may set. TAC owns `url`, `action` and `conversationConfiguration`. */
export const EDITABLE_FIELDS = [
  'welcomeGreeting',
  'welcomeGreetingInterruptible',
  'language',
  'ttsLanguage',
  'transcriptionLanguage',
  'ttsProvider',
  'voice',
  'elevenlabsTextNormalization',
  'transcriptionProvider',
  'speechModel',
  'deepgramSmartFormat',
  'eotThreshold',
  'partialPrompts',
  'speechTimeout',
  'interruptible',
  'interruptSensitivity',
  'reportInputDuringAgentSpeech',
  'ignoreBackchannel',
  'preemptible',
  'dtmfDetection',
  'hints',
  'events',
  'debug',
  'intelligenceService',
] as const;

/** Returns the preset seeded into a fresh database. */
export function defaultPreset(id: string): RelayPreset {
  return {
    id,
    name: 'Default (ElevenLabs + Deepgram)',
    updatedAt: new Date().toISOString(),
    options: {
      welcomeGreeting:
        'Thanks for calling Summit Heating and Air. This is Sky, the virtual assistant. How can I help you today?',
      welcomeGreetingInterruptible: 'any',
      language: 'en-US',
      ttsProvider: 'ElevenLabs',
      voice: 'UgBBYS2sOqTuMpoF3BR0',
      transcriptionProvider: 'Deepgram',
      speechModel: 'nova-3-general',
      interruptible: 'any',
      interruptSensitivity: 'high',
      hints: 'HVAC, furnace, heat pump, condenser, Trane, Carrier, Lennox, Rheem, Goodman, SEER, BTU, thermostat',
    },
  };
}

/** Keeps only editable fields with a non-empty value, so blanks fall through to TAC defaults. */
export function sanitizeOptions(input: Record<string, unknown>): VoiceTwiMLOptionsConversationRelay {
  const out: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    const value = input[field];
    if (value === undefined || value === null || value === '') continue;
    out[field] = value;
  }
  return out as VoiceTwiMLOptionsConversationRelay;
}
