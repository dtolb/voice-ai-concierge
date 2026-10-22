import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { SMSChannel, TAC, TACConfig, TACServer, VoiceChannel, type ConversationId } from 'twilio-agent-connect';
import { endCallRecord, refreshProfile, startCall } from './calls.ts';
import { activePreset, findCall, latestCallForConversation, loadDb, newId, saveDb } from './db.ts';
import { registerEventStream } from './events.ts';
import { registerIntelligenceWebhook } from './intelligence.ts';
import { DEFAULT_PROMPT } from './prompt.ts';
import { registerApi } from './routes.ts';
import { forgetConversation, handleInterrupt, handleSmsTurn, handleVoiceTurn } from './turn.ts';
import { defaultPreset } from './twiml.ts';
import { closeConversation } from './twilio-api.ts';

const PORT = Number(process.env.PORT ?? 8000);
const WEB_DIST = resolve('dist/web');

// --- State: database.json, seeded with the default prompt and TwiML preset ---

loadDb(() => {
  const promptId = newId();
  const presetId = newId();
  return {
    calls: [],
    prompts: [{ id: promptId, createdAt: new Date().toISOString(), label: 'Initial HVAC concierge', text: DEFAULT_PROMPT }],
    activePromptId: promptId,
    presets: [defaultPreset(presetId)],
    activePresetId: presetId,
  };
});

// --- TAC: one SDK instance, a voice channel (ConversationRelay) and an SMS channel ---

const tac = await TAC.create({ config: TACConfig.fromEnv() });
const voice = new VoiceChannel(tac, { memoryMode: 'once' });
const sms = new SMSChannel(tac, { memoryMode: 'always' });
tac.registerChannel(voice);
tac.registerChannel(sms);

// --- 1. A call arrives: answer with <ConversationRelay> built from the active preset ---

voice.onInboundCallTwiml(async req => {
  const preset = activePreset();
  if (req.callSid) {
    startCall({ channel: 'voice', callSid: req.callSid, from: req.from ?? '', to: req.to ?? '', presetId: preset.id });
  }
  return preset.options;
});

// --- 2. ConversationRelay connects: link the call to its Orchestrator conversation and Memory profile ---

voice.on('webSocketConnected', ({ conversationId }: { conversationId: ConversationId }) => {
  const session = voice.getConversationSession(conversationId);
  const call = session?.callSid ? findCall({ callSid: session.callSid }) : undefined;
  if (!call) return;
  call.conversationId = conversationId;
  if (session?.profileId) call.profileId = session.profileId;
  saveDb();
  void refreshProfile(call);
});

// --- 3. The caller speaks (or texts): run one agent turn ---

tac.onMessageReady(async ({ conversationId, message, memory, session, channel, abortSignal }) => {
  if (channel === 'voice') {
    const call = findCall({ callSid: session.callSid ?? '' });
    if (!call) return;
    try {
      await handleVoiceTurn({ call, conversationId, message, memory, session, abortSignal }, voice);
    } catch (error) {
      if (!abortSignal?.aborted) tac.logger.error({ err: error, conversationId }, 'Voice turn failed');
    }
    return;
  }

  const call =
    latestCallForConversation(conversationId) ??
    startCall({
      channel: 'sms',
      conversationId,
      ...(session.profileId && { profileId: session.profileId }),
      from: session.authorInfo?.address ?? '',
      to: process.env.TWILIO_PHONE_NUMBER ?? '',
    });
  return handleSmsTurn({ call, conversationId, message, memory, session, abortSignal });
});

// --- 4. The caller barges in: keep only what they actually heard ---

tac.onInterrupt(({ conversationId, utteranceUntilInterrupt }) => {
  handleInterrupt(latestCallForConversation(conversationId), conversationId, utteranceUntilInterrupt);
});

// --- 5. The call ends: close the conversation, which fires the end-of-call Intelligence rule ---

voice.on('webSocketDisconnected', ({ conversationId }: { conversationId: ConversationId }) => {
  const call = latestCallForConversation(conversationId);
  if (!call || call.status === 'ended') return;
  endCallRecord(call);
  forgetConversation(conversationId);
  void refreshProfile(call);
  closeConversation(conversationId).catch(error => tac.logger.warn({ err: error, conversationId }, 'Closing conversation failed'));
});

voice.onCallStatus(event => {
  const call = findCall({ callSid: event.callSid });
  if (call && event.callStatus === 'completed') endCallRecord(call, event.callDuration ? Number(event.callDuration) : undefined);
});

// --- HTTP: the web app, its API, live events and the Intelligence webhook, on TAC's Fastify server ---

const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' }, trustProxy: true });
registerEventStream(app);
registerApi(app, voice);
registerIntelligenceWebhook(app, refreshProfile);
app.get('/health', async () => ({ status: 'ok' }));
if (existsSync(WEB_DIST)) {
  await app.register(fastifyStatic, { root: WEB_DIST, wildcard: false });
  app.setNotFoundHandler((request, reply) =>
    request.method === 'GET' && !request.url.startsWith('/api') ? reply.sendFile('index.html') : reply.code(404).send({ error: 'Not found' })
  );
}

const server = new TACServer(tac, { fastifyInstance: app, port: PORT });
await server.start();
