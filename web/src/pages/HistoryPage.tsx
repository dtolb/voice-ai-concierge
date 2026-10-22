import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@gtmi/strix-react/atoms/badge';
import { Button } from '@gtmi/strix-react/atoms/button';
import { Card } from '@gtmi/strix-react/atoms/card';
import { MetricList } from '@gtmi/strix-react/atoms/metric-list';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import { InfoSection } from '@gtmi/strix-react/molecules/info-section';
import { cn } from '@gtmi/strix-react/cn';
import { api, formatDuration, formatTime, useLiveEvents, type CallDetail, type CallSummary } from '../api';
import { InterestBadge, OperatorResultView, ProfileTraits, SentimentBadge, Transcript, latestSentiment } from './shared';

/** Call history: a list of every call and the full record of the selected one. */
export function HistoryPage({ openCallId, onSelect }: { openCallId: string | undefined; onSelect: (id: string) => void }) {
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [detail, setDetail] = useState<CallDetail>();

  const loadList = useCallback(async () => setCalls(await api<CallSummary[]>('/api/calls')), []);
  const selected = openCallId ?? calls[0]?.id;

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selected) void api<CallDetail>(`/api/calls/${selected}`).then(setDetail);
  }, [selected]);

  useLiveEvents(event => {
    if (event.type === 'call.started' || event.type === 'call.ended' || event.type === 'intelligence' || event.type === 'profile') {
      void loadList();
      if (event.callId === selected) void api<CallDetail>(`/api/calls/${selected}`).then(setDetail);
    }
  });

  return (
    <div className="mt-gap-400 grid gap-gap-400 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card padding="none" className="flex max-h-[48rem] flex-col overflow-y-auto">
        {calls.length === 0 && (
          <Typography as="p" variant="body-s" className="p-padding-horizontal-md text-text-tertiary">
            No calls recorded yet.
          </Typography>
        )}
        {calls.map(call => (
          <button
            key={call.id}
            type="button"
            onClick={() => onSelect(call.id)}
            className={cn(
              'flex flex-col gap-gap-100 border-b border-border-neutral-soft px-padding-horizontal-md py-padding-vertical-sm text-left hover:bg-surface-tertiary',
              call.id === selected && 'bg-surface-tertiary'
            )}
          >
            <div className="flex items-center justify-between gap-gap-200">
              <Typography variant="body-s-semibold">{call.from || 'Unknown caller'}</Typography>
              <Badge size="small" label={call.channel === 'voice' ? 'Voice' : 'SMS'} variant={call.status === 'active' ? 'error' : 'neutral'} hasIndicator={call.status === 'active'} />
            </div>
            <Typography variant="body-xs" className="text-text-tertiary">
              {formatTime(call.startedAt)} · {formatDuration(call.durationSec)} · {call.turns} turns
            </Typography>
            <div className="flex flex-wrap gap-gap-100">
              {call.sentiment?.label && <Badge size="small" label={call.sentiment.label} variant="neutral" />}
              {call.purchaseInterest && <Badge size="small" label={`Interest ${call.purchaseInterest}`} variant="neutral" />}
            </div>
          </button>
        ))}
      </Card>

      {detail ? <CallDetailView call={detail} onDeleted={() => void loadList()} /> : <Card padding="lg">Select a call.</Card>}
    </div>
  );
}

function CallDetailView({ call, onDeleted }: { call: CallDetail; onDeleted: () => void }) {
  const realtime = call.intelligence.filter(r => r.trigger === 'COMMUNICATION');
  const postCall = call.intelligence.filter(r => r.trigger !== 'COMMUNICATION');
  const firstTokens = call.latency.map(l => l.firstTokenMs).filter(ms => ms >= 0);
  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);

  const remove = async () => {
    await api(`/api/calls/${call.id}`, { method: 'DELETE' });
    onDeleted();
  };

  return (
    <div className="flex flex-col gap-gap-400">
      <Card padding="md" className="flex flex-col gap-gap-300">
        <div className="flex flex-wrap items-center justify-between gap-gap-200">
          <div className="flex flex-col gap-gap-100">
            <Typography as="h2" variant="h5">
              {call.from} · {formatTime(call.startedAt)}
            </Typography>
            <Typography variant="mono-s-regular" className="text-text-tertiary">
              {call.callSid ?? call.conversationId}
            </Typography>
          </div>
          <div className="flex flex-wrap items-center gap-gap-200">
            {call.insightsUrl && (
              <Button variant="primary" render={<a href={call.insightsUrl} target="_blank" rel="noreferrer" />}>
                View Insights
              </Button>
            )}
            <Button variant="ghost" onClick={() => void remove()}>
              Delete
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-gap-200">
          <SentimentBadge label={latestSentiment(postCall) ?? latestSentiment(realtime)} />
          <InterestBadge level={call.profileTraits?.HvacService?.purchaseInterest} />
          {call.preset && <Badge label={`TwiML: ${call.preset.name}`} variant="default" />}
          {call.prompt && <Badge label={`Prompt: ${call.prompt.label}`} variant="default" />}
        </div>
        <MetricList
          groups={[
            {
              heading: 'Call',
              metrics: [
                { label: 'Duration', value: formatDuration(call.durationSec) },
                { label: 'Caller turns', value: call.transcript.filter(t => t.speaker === 'caller').length },
                { label: 'Interruptions', value: call.transcript.filter(t => t.interrupted).length },
              ],
            },
            {
              heading: 'App latency (measured here)',
              metrics: [
                { label: 'Avg first token', value: avg(firstTokens), unit: 'ms' },
                { label: 'Max first token', value: firstTokens.length ? Math.max(...firstTokens) : null, unit: 'ms' },
                { label: 'Avg full reply', value: avg(call.latency.map(l => l.fullResponseMs)), unit: 'ms' },
              ],
            },
          ]}
        />
        <Typography as="p" variant="body-xs" className="text-text-tertiary">
          Speech-to-text, text-to-speech and network latency per turn are in Twilio Voice Insights (View Insights).
        </Typography>
      </Card>

      <div className="grid gap-gap-400 xl:grid-cols-2">
        <Card padding="md">
          <InfoSection title="Transcript" titleAs="h3">
            <Transcript lines={call.transcript} className="h-[30rem]" />
          </InfoSection>
        </Card>
        <div className="flex flex-col gap-gap-400">
          <Card padding="md">
            <InfoSection title="Conversation Intelligence" titleAs="h3">
              {postCall.length === 0 && (
                <Typography as="p" variant="body-s" className="text-text-tertiary">
                  End-of-call results arrive a few seconds after the conversation closes.
                </Typography>
              )}
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
              {realtime.length > 0 && (
                <div className="mt-gap-300 flex flex-col gap-gap-100">
                  <Typography variant="eyebrow-s-semibold" className="text-text-tertiary">
                    Sentiment per utterance
                  </Typography>
                  <div className="flex flex-wrap gap-gap-100">
                    {realtime.map((r, i) => (
                      <Badge key={i} size="small" label={String((r.result as { label?: string }).label ?? '?')} variant="neutral" />
                    ))}
                  </div>
                </div>
              )}
            </InfoSection>
          </Card>
          <Card padding="md">
            <InfoSection title="Customer profile (Memory)" titleAs="h3">
              <ProfileTraits traits={call.profileTraits} />
            </InfoSection>
          </Card>
          {call.toolCalls.length > 0 && (
            <Card padding="md">
              <InfoSection title="Agent tool calls" titleAs="h3">
                {call.toolCalls.map((t, i) => (
                  <div key={i} className="flex flex-col gap-gap-100">
                    <Typography variant="body-xs" className="text-text-tertiary">
                      {formatTime(t.at)} · {t.name}
                    </Typography>
                    <Typography as="pre" variant="mono-s-regular" className="whitespace-pre-wrap break-all text-text-secondary">
                      {JSON.stringify(t.args, null, 2)}
                    </Typography>
                  </div>
                ))}
              </InfoSection>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
