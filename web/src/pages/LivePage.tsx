import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@gtmi/strix-react/atoms/badge';
import { Button } from '@gtmi/strix-react/atoms/button';
import { Card } from '@gtmi/strix-react/atoms/card';
import { CallTimer } from '@gtmi/strix-react/atoms/call-timer';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import { InfoSection } from '@gtmi/strix-react/molecules/info-section';
import { api, useLiveEvents, type CallDetail, type CallSummary, type LiveEvent } from '../api';
import { InterestBadge, OperatorResultView, ProfileTraits, SentimentBadge, Transcript, latestSentiment } from './shared';

/** The live view: the active (or most recent) call, streaming as it happens. */
export function LivePage({ onOpenCall }: { onOpenCall: (id: string) => void }) {
  const [call, setCall] = useState<CallDetail>();
  const [streaming, setStreaming] = useState('');

  const load = useCallback(async (id?: string) => {
    const target = id ?? (await api<CallSummary[]>('/api/calls'))[0]?.id;
    if (target) setCall(await api<CallDetail>(`/api/calls/${target}`));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useLiveEvents((event: LiveEvent) => {
    if (event.type === 'call.started') {
      setStreaming('');
      void load(event.callId);
      return;
    }
    if (!call || event.callId !== call.id) return;
    if (event.type === 'agent.token') setStreaming(s => s + event.token);
    else if (event.type === 'transcript') {
      if (event.speaker === 'agent') setStreaming('');
      setCall(c => c && { ...c, transcript: [...c.transcript, { at: new Date().toISOString(), speaker: event.speaker as 'caller', text: event.text, ...(event.interrupted && { interrupted: true }) }] });
    } else void load(call.id);
  });

  if (!call) {
    return (
      <Card padding="lg" className="mt-gap-400">
        <Typography as="p" variant="body-m-regular">
          No calls yet. Call the number above and ask about replacing your furnace or air conditioner.
        </Typography>
      </Card>
    );
  }

  const live = call.status === 'active';
  const realtime = call.intelligence.filter(r => r.trigger === 'COMMUNICATION');
  const postCall = call.intelligence.filter(r => r.trigger !== 'COMMUNICATION');
  const hvac = call.profileTraits?.HvacService;

  return (
    <div className="mt-gap-400 grid gap-gap-400 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Card padding="md" className="flex flex-col gap-gap-300">
        <div className="flex flex-wrap items-center justify-between gap-gap-200">
          <div className="flex flex-wrap items-center gap-gap-200">
            <Badge label={live ? 'Live' : 'Ended'} variant={live ? 'error' : 'neutral'} hasIndicator={live} />
            <Badge label={call.channel === 'voice' ? 'Voice' : 'SMS'} variant="default" />
            <Typography variant="body-s-medium">{call.from}</Typography>
            {live && call.channel === 'voice' && (
              <CallTimer seconds={Math.max(0, Math.round((Date.now() - Date.parse(call.startedAt)) / 1000))} isRunning />
            )}
          </div>
          <div className="flex items-center gap-gap-200">
            {call.insightsUrl && (
              <Button variant="secondary" render={<a href={call.insightsUrl} target="_blank" rel="noreferrer" />}>
                View Insights
              </Button>
            )}
            <Button variant="ghost" onClick={() => onOpenCall(call.id)}>
              Open in history
            </Button>
          </div>
        </div>
        <Transcript lines={call.transcript} streaming={streaming} className="h-[32rem]" />
      </Card>

      <div className="flex flex-col gap-gap-400">
        <Card padding="md">
          <InfoSection title="Real-time sentiment" titleAs="h2">
            <div className="flex flex-wrap items-center gap-gap-200">
              <SentimentBadge label={latestSentiment(realtime)} />
              <Typography variant="body-xs" className="text-text-tertiary">
                {realtime.length} per-utterance result{realtime.length === 1 ? '' : 's'}
              </Typography>
            </div>
            <div className="mt-gap-200 flex flex-wrap gap-gap-100">
              {realtime.slice(-12).map((r, i) => (
                <Badge key={i} size="small" label={String((r.result as { label?: string }).label ?? '?')} variant="neutral" />
              ))}
            </div>
          </InfoSection>
        </Card>

        <Card padding="md">
          <InfoSection title="Customer profile (Memory)" titleAs="h2">
            <div className="mb-gap-200 flex flex-wrap gap-gap-200">
              <InterestBadge level={hvac?.purchaseInterest} />
              {hvac?.addressConfirmed === true && <Badge label="Address confirmed" variant="success" />}
            </div>
            <ProfileTraits traits={call.profileTraits} />
          </InfoSection>
        </Card>

        {call.toolCalls.length > 0 && (
          <Card padding="md">
            <InfoSection title="Agent tool calls" titleAs="h2">
              {call.toolCalls.map((t, i) => (
                <Typography key={i} as="p" variant="mono-s-regular" className="break-all text-text-secondary">
                  {t.name} {JSON.stringify(t.args)}
                </Typography>
              ))}
            </InfoSection>
          </Card>
        )}

        {postCall.length > 0 && (
          <Card padding="md">
            <InfoSection title="Post-call intelligence" titleAs="h2">
              <div className="flex flex-col gap-gap-300">
                {postCall.map((r, i) => (
                  <div key={i} className="flex flex-col gap-gap-100">
                    <Typography variant="eyebrow-s-semibold" className="text-text-tertiary">
                      {r.operator}
                    </Typography>
                    <OperatorResultView result={r} />
                  </div>
                ))}
              </div>
            </InfoSection>
          </Card>
        )}
      </div>
    </div>
  );
}
