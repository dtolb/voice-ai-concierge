const env = process.env;
const auth = `Basic ${Buffer.from(`${env.TWILIO_API_KEY}:${env.TWILIO_API_SECRET}`).toString('base64')}`;

/** Sends a JSON request to a Twilio API with API-key Basic auth. Throws on non-2xx. */
async function twilioJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${method} ${url} -> ${response.status}: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

function storeId(): string {
  const id = env.TWILIO_MEMORY_STORE_ID;
  if (!id) throw new Error('TWILIO_MEMORY_STORE_ID is not set');
  return id;
}

/** Merges trait groups into a Memory profile. Only the given traits change. */
export async function patchProfileTraits(
  profileId: string,
  traits: Record<string, Record<string, unknown>>
): Promise<void> {
  await twilioJson('PATCH', `https://memory.twilio.com/v1/Stores/${storeId()}/Profiles/${profileId}`, { traits });
}

/** Returns a Memory profile's traits, grouped by trait group. */
export async function getProfileTraits(profileId: string): Promise<Record<string, unknown>> {
  const profile = await twilioJson<{ traits?: Record<string, unknown> }>(
    'GET',
    `https://memory.twilio.com/v1/Stores/${storeId()}/Profiles/${profileId}`
  );
  return profile.traits ?? {};
}

/** Moves an Orchestrator conversation to CLOSED, which fires CONVERSATION_END rules. */
export async function closeConversation(conversationId: string): Promise<void> {
  await twilioJson('PUT', `https://conversations.twilio.com/v2/Conversations/${conversationId}`, { status: 'CLOSED' });
}

/** Builds the Console URL that opens Voice Insights for a call. */
export function insightsUrl(callSid: string): string {
  const frame = `/console/voice/calls/logs/${callSid}?x-target-region=us1&__override_layout__=embed&bifrost=true`;
  return `https://1console.twilio.com/account/${env.TWILIO_ACCOUNT_SID}/us1/logs/calls?frameUrl=${encodeURIComponent(frame)}`;
}
