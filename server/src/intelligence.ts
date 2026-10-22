import type { FastifyInstance } from 'fastify';
import { findCall, latestCallForConversation, saveDb, type CallRecord } from './db.ts';
import { publish } from './events.ts';
import { patchProfileTraits } from './twilio-api.ts';

interface OperatorResult {
  id: string;
  operator: { id: string; displayName?: string; name?: string };
  outputFormat: string;
  result: unknown;
  dateCreated: string;
  referenceIds?: string[];
  executionDetails?: {
    trigger?: { on?: string };
    participants?: { type?: string; profileId?: string }[];
  };
}

interface RuleExecutionPayload {
  conversationId: string;
  operatorResults: OperatorResult[];
}

interface LeadResult {
  purchaseInterest?: string;
  purchaseInterestRationale?: string;
  serviceAddress?: string;
  addressConfirmed?: boolean;
  reasonForCalling?: string;
  serviceType?: string;
  urgency?: string;
}

function callFor(payload: RuleExecutionPayload, result: OperatorResult): CallRecord | undefined {
  for (const ref of result.referenceIds ?? []) {
    const call = findCall({ callSid: ref });
    if (call) return call;
  }
  return latestCallForConversation(payload.conversationId);
}

function customerProfileId(result: OperatorResult): string | undefined {
  return result.executionDetails?.participants?.find(p => p.type === 'CUSTOMER' && p.profileId)?.profileId;
}

async function applyLeadResult(call: CallRecord, profileId: string, lead: LeadResult): Promise<void> {
  const hvac: Record<string, unknown> = {};
  if (lead.purchaseInterest && lead.purchaseInterest !== 'UNKNOWN') hvac.purchaseInterest = lead.purchaseInterest;
  if (lead.purchaseInterestRationale) hvac.purchaseInterestRationale = lead.purchaseInterestRationale;
  if (!call.toolCalls.some(t => t.name === 'save_customer_details')) {
    if (lead.serviceAddress) hvac.serviceAddress = lead.serviceAddress;
    if (lead.reasonForCalling) hvac.reasonForCalling = lead.reasonForCalling;
    if (lead.serviceType && lead.serviceType !== 'UNKNOWN') hvac.serviceType = lead.serviceType;
    if (lead.urgency && lead.urgency !== 'UNKNOWN') hvac.urgency = lead.urgency;
    if (lead.addressConfirmed !== undefined) hvac.addressConfirmed = lead.addressConfirmed;
  }
  if (Object.keys(hvac).length > 0) await patchProfileTraits(profileId, { HvacService: hvac });
}

/** Registers POST /webhooks/intelligence, the Rule Execution webhook for both Intelligence rules. */
export function registerIntelligenceWebhook(
  app: FastifyInstance,
  refreshProfile: (call: CallRecord) => Promise<void>
): void {
  app.post('/webhooks/intelligence', async (request, reply) => {
    const payload = request.body as RuleExecutionPayload;
    const leadOperatorId = process.env.TWILIO_LEAD_OPERATOR_ID;
    for (const result of payload.operatorResults ?? []) {
      const call = callFor(payload, result);
      if (!call) {
        app.log.warn({ conversationId: payload.conversationId }, 'Intelligence result for unknown call');
        continue;
      }
      const operator = result.operator.displayName ?? result.operator.name ?? result.operator.id;
      const trigger = result.executionDetails?.trigger?.on ?? 'UNKNOWN';
      call.intelligence.push({
        at: result.dateCreated,
        operator,
        operatorId: result.operator.id,
        outputFormat: result.outputFormat,
        trigger,
        result: result.result,
      });
      call.profileId ??= customerProfileId(result);
      saveDb();
      publish({ type: 'intelligence', callId: call.id, operator, result: result.result, trigger });

      const profileId = customerProfileId(result) ?? call.profileId;
      if (result.operator.id === leadOperatorId && profileId) {
        try {
          await applyLeadResult(call, profileId, result.result as LeadResult);
          await refreshProfile(call);
        } catch (error) {
          app.log.error({ err: error, profileId }, 'Writing lead result to profile failed');
        }
      }
    }
    return reply.code(200).send({ status: 'ok' });
  });
}
