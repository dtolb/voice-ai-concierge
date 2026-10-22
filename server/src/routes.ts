import type { FastifyInstance } from 'fastify';
import type { VoiceChannel } from 'twilio-agent-connect';
import { activePreset, activePrompt, getDb, newId, saveDb } from './db.ts';
import { EDITABLE_FIELDS, sanitizeOptions } from './twiml.ts';
import { insightsUrl } from './twilio-api.ts';

const env = process.env;

/** Indents TwiML one element per line, with one attribute per line on the ConversationRelay noun. */
function formatXml(xml: string): string {
  return xml
    .replace(/></g, '>\n<')
    .replace(/<ConversationRelay ([^>]*?)(\/?)>/, (_m, attrs: string, close: string) =>
      `<ConversationRelay\n${attrs.trim().split(/" /).map(a => `      ${a.endsWith('"') ? a : `${a}"`}`).join('\n')}${close ? ' />' : '>'}`
    )
    .split('\n')
    .map(line => (line.startsWith('<Connect') || line.startsWith('</Connect') ? `  ${line}` : line.startsWith('<ConversationRelay') ? `    ${line}` : line))
    .join('\n');
}

/** Registers the JSON API the web app uses. */
export function registerApi(app: FastifyInstance, voice: VoiceChannel): void {
  app.get('/api/config', async () => ({
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    accountSid: env.TWILIO_ACCOUNT_SID,
    model: env.OPENAI_MODEL,
    memoryStoreId: env.TWILIO_MEMORY_STORE_ID,
    conversationConfigurationId: env.TWILIO_CONVERSATION_CONFIGURATION_ID,
    intelligenceConfigurationId: env.TWILIO_INTELLIGENCE_CONFIG_ID,
    leadOperatorId: env.TWILIO_LEAD_OPERATOR_ID,
    publicHost: env.TWILIO_VOICE_PUBLIC_DOMAIN,
  }));

  app.get('/api/calls', async () =>
    getDb()
      .calls.slice()
      .reverse()
      .map(c => ({
        id: c.id,
        channel: c.channel,
        callSid: c.callSid,
        from: c.from,
        status: c.status,
        startedAt: c.startedAt,
        durationSec: c.durationSec,
        turns: c.transcript.filter(t => t.speaker === 'caller').length,
        sentiment: [...c.intelligence].reverse().find(i => i.operator === 'Sentiment')?.result,
        purchaseInterest: (c.profileTraits?.HvacService as Record<string, unknown> | undefined)?.purchaseInterest,
      }))
  );

  app.get<{ Params: { id: string } }>('/api/calls/:id', async (request, reply) => {
    const call = getDb().calls.find(c => c.id === request.params.id);
    if (!call) return reply.code(404).send({ error: 'Not found' });
    const db = getDb();
    return {
      ...call,
      insightsUrl: call.callSid ? insightsUrl(call.callSid) : undefined,
      prompt: db.prompts.find(p => p.id === call.promptVersionId),
      preset: db.presets.find(p => p.id === call.presetId),
    };
  });

  app.delete('/api/calls', async () => {
    const db = getDb();
    const cleared = db.calls.length;
    db.calls = [];
    saveDb();
    return { cleared };
  });

  app.delete<{ Params: { id: string } }>('/api/calls/:id', async request => {
    const db = getDb();
    db.calls = db.calls.filter(c => c.id !== request.params.id);
    saveDb();
    return { ok: true };
  });

  app.get('/api/prompts', async () => ({ activeId: activePrompt().id, versions: getDb().prompts.slice().reverse() }));

  app.post<{ Body: { text: string; label?: string } }>('/api/prompts', async request => {
    const db = getDb();
    const version = {
      id: newId(),
      createdAt: new Date().toISOString(),
      label: request.body.label?.trim() || `Version ${db.prompts.length + 1}`,
      text: request.body.text,
    };
    db.prompts.push(version);
    db.activePromptId = version.id;
    saveDb();
    return version;
  });

  app.post<{ Params: { id: string } }>('/api/prompts/:id/activate', async (request, reply) => {
    const db = getDb();
    if (!db.prompts.some(p => p.id === request.params.id)) return reply.code(404).send({ error: 'Not found' });
    db.activePromptId = request.params.id;
    saveDb();
    return { ok: true };
  });

  app.get('/api/presets', async () => ({ activeId: activePreset().id, presets: getDb().presets, fields: EDITABLE_FIELDS }));

  app.post<{ Body: { id?: string; name: string; options: Record<string, unknown>; activate?: boolean } }>(
    '/api/presets',
    async request => {
      const db = getDb();
      const options = sanitizeOptions(request.body.options);
      const existing = request.body.id ? db.presets.find(p => p.id === request.body.id) : undefined;
      const preset = existing ?? { id: newId(), name: '', updatedAt: '', options };
      preset.name = request.body.name.trim() || 'Untitled preset';
      preset.options = options;
      preset.updatedAt = new Date().toISOString();
      if (!existing) db.presets.push(preset);
      if (request.body.activate) db.activePresetId = preset.id;
      saveDb();
      return preset;
    }
  );

  app.post<{ Params: { id: string } }>('/api/presets/:id/activate', async (request, reply) => {
    const db = getDb();
    if (!db.presets.some(p => p.id === request.params.id)) return reply.code(404).send({ error: 'Not found' });
    db.activePresetId = request.params.id;
    saveDb();
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>('/api/presets/:id', async (request, reply) => {
    const db = getDb();
    if (db.presets.length <= 1) return reply.code(400).send({ error: 'Keep at least one preset' });
    db.presets = db.presets.filter(p => p.id !== request.params.id);
    if (db.activePresetId === request.params.id) db.activePresetId = db.presets[0]!.id;
    saveDb();
    return { ok: true };
  });

  app.post<{ Body: { options: Record<string, unknown> } }>('/api/twiml/preview', async request => ({
    twiml: formatXml(await voice.handleIncomingCall(undefined, { hostTwimlOptions: sanitizeOptions(request.body.options) })),
  }));

}
