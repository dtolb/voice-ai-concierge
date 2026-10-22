import { Agent, run, setTracingDisabled, tool, type AgentInputItem } from '@openai/agents';
import { z } from 'zod';
import { MemoryPromptBuilder, type ConversationSession, type TACMemoryResponse } from 'twilio-agent-connect';
import { patchProfileTraits } from './twilio-api.ts';

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-6-luna';
const REASONING_EFFORT = (process.env.OPENAI_REASONING_EFFORT ?? 'low') as 'minimal' | 'low' | 'medium' | 'high';

setTracingDisabled(true);

/** What a tool call needs to know about the conversation it runs in. */
export interface TurnContext {
  profileId: string | undefined;
  callSid: string | undefined;
  phone: string;
  channel: 'voice' | 'sms';
  onToolCall: (name: string, args: unknown, result: unknown) => void;
  onEndCall: () => void;
}

const CustomerDetails = z.object({
  firstName: z.string().describe('Caller first name'),
  lastName: z.string().describe('Caller last name, empty string if not given'),
  street: z.string().describe('Street address including number and unit'),
  city: z.string(),
  state: z.string().describe('Two-letter state code'),
  postalCode: z.string(),
  addressConfirmed: z.boolean().describe('True only after the caller confirmed the read-back address'),
  reasonForCalling: z.string().describe('One sentence on why the customer called'),
  serviceType: z.enum(['REPLACEMENT', 'REPAIR', 'MAINTENANCE', 'INSTALLATION', 'QUOTE', 'OTHER']),
  urgency: z.enum(['EMERGENCY', 'SOON', 'FLEXIBLE']),
});

/** Builds the save_customer_details tool, bound to one turn's profile. */
function saveCustomerDetails(ctx: TurnContext) {
  return tool({
    name: 'save_customer_details',
    description:
      'Save the caller name, confirmed service address and reason for calling to their customer profile. ' +
      'Call this as soon as the caller confirms the address, and again when any detail changes.',
    parameters: CustomerDetails,
    execute: async details => {
      const serviceAddress = `${details.street}, ${details.city}, ${details.state} ${details.postalCode}`;
      const traits = {
        Contact: {
          firstName: details.firstName,
          ...(details.lastName && { lastName: details.lastName }),
          street: details.street,
          city: details.city,
          state: details.state,
          postalCode: details.postalCode,
          phone: ctx.phone,
        },
        HvacService: {
          serviceAddress,
          addressConfirmed: details.addressConfirmed,
          reasonForCalling: details.reasonForCalling,
          serviceType: details.serviceType,
          urgency: details.urgency,
          ...(ctx.callSid && { lastCallSid: ctx.callSid }),
        },
      };
      let result: { saved: boolean; error?: string };
      if (!ctx.profileId) {
        result = { saved: false, error: 'No customer profile is linked to this conversation yet.' };
      } else {
        try {
          await patchProfileTraits(ctx.profileId, traits);
          result = { saved: true };
        } catch (error) {
          result = { saved: false, error: error instanceof Error ? error.message : String(error) };
        }
      }
      ctx.onToolCall('save_customer_details', details, { ...result, traits });
      return result;
    },
  });
}

/** Builds the end_call tool, which hangs up once the current reply has been spoken. */
function endCall(ctx: TurnContext) {
  return tool({
    name: 'end_call',
    description:
      'Hang up the phone call. Call this in the same turn as your final goodbye, after the caller has said they need nothing else. ' +
      'Always say the goodbye sentence in your reply text as well; the call ends after it is spoken.',
    parameters: z.object({ reason: z.string().describe('Why the call is ending, e.g. "caller has nothing else"') }),
    execute: async ({ reason }) => {
      ctx.onEndCall();
      ctx.onToolCall('end_call', { reason }, { scheduled: true });
      return { ending: true, instruction: 'Say a short goodbye now. Do not ask any further questions.' };
    },
  });
}

/** Builds the agent for one turn: the active prompt, the caller's memory and the tools. */
export function buildAgent(
  instructions: string,
  memory: TACMemoryResponse | undefined,
  session: ConversationSession | undefined,
  ctx: TurnContext,
  channel: 'voice' | 'sms'
): Agent {
  const channelNote =
    channel === 'sms'
      ? '\n\nThis conversation is by text message. Replies can be a little longer but stay under 300 characters.'
      : '';
  return new Agent({
    name: 'hvac-concierge',
    instructions: MemoryPromptBuilder.compose(instructions + channelNote, memory, session),
    model: MODEL,
    modelSettings: { reasoning: { effort: REASONING_EFFORT } },
    tools: channel === 'voice' ? [saveCustomerDetails(ctx), endCall(ctx)] : [saveCustomerDetails(ctx)],
  });
}

/** Streams one agent turn's text tokens; resolves `completed` when tools and text are done. */
export async function streamTurn(
  agent: Agent,
  history: AgentInputItem[],
  signal: AbortSignal | undefined
): Promise<{ tokens: AsyncIterable<string>; completed: Promise<unknown> }> {
  const result = await run(agent, history, { stream: true, ...(signal && { signal }) });
  return { tokens: result.toTextStream(), completed: result.completed };
}

/** Runs one agent turn to completion and returns its final text. */
export async function runTurn(agent: Agent, history: AgentInputItem[]): Promise<string> {
  const result = await run(agent, history);
  return String(result.finalOutput ?? '');
}
