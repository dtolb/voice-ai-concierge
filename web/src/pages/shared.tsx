import { Badge, type BadgeVariant } from '@gtmi/strix-react/atoms/badge';
import { ChatLog, type ChatLogEntry } from '@gtmi/strix-react/atoms/chat-log';
import { InfoRow } from '@gtmi/strix-react/atoms/info-row';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import type { IntelligenceResult, TranscriptLine } from '../api';

const SENTIMENT_VARIANT: Record<string, BadgeVariant> = {
  positive: 'success',
  neutral: 'neutral',
  mixed: 'warning',
  negative: 'error',
};

const INTEREST_VARIANT: Record<string, BadgeVariant> = { HIGH: 'success', MEDIUM: 'warning', LOW: 'neutral' };

/** A sentiment label as a coloured badge. */
export function SentimentBadge({ label }: { label: string | undefined }) {
  if (!label) return <Badge label="No sentiment yet" variant="default" />;
  return <Badge label={`Sentiment: ${label}`} variant={SENTIMENT_VARIANT[label.toLowerCase()] ?? 'default'} />;
}

/** A purchase-interest level as a coloured badge. */
export function InterestBadge({ level }: { level: unknown }) {
  if (typeof level !== 'string' || !level) return null;
  return <Badge label={`Interest: ${level}`} variant={INTEREST_VARIANT[level] ?? 'default'} />;
}

/** The call transcript, plus an optional in-progress agent reply. */
export function Transcript({ lines, streaming, className }: { lines: TranscriptLine[]; streaming?: string; className?: string }) {
  const entries: ChatLogEntry[] = lines.map((line, i) =>
    line.speaker === 'system'
      ? { id: String(i), type: 'event', variant: 'info', text: line.text }
      : {
          id: String(i),
          type: 'message',
          author: line.speaker === 'caller' ? 'Caller' : line.interrupted ? 'Sky (cut off)' : 'Sky',
          text: line.text,
          authorColor: line.speaker === 'caller' ? 'default' : 'accent',
        }
  );
  if (streaming) entries.push({ id: 'streaming', type: 'message', author: 'Sky …', text: streaming, authorColor: 'accent' });
  if (entries.length === 0) entries.push({ id: 'empty', type: 'event', variant: 'info', text: 'Waiting for the caller to speak.' });
  return <ChatLog entries={entries} className={className ?? 'h-[28rem]'} />;
}

/** Profile traits grouped by trait group, as label/value rows. */
export function ProfileTraits({ traits }: { traits: Record<string, Record<string, unknown>> | undefined }) {
  const groups = Object.entries(traits ?? {}).filter(([, values]) => values && Object.keys(values).length > 0);
  if (groups.length === 0) {
    return (
      <Typography as="p" variant="body-s" className="text-text-tertiary">
        No traits on the profile yet.
      </Typography>
    );
  }
  return (
    <div className="flex flex-col gap-gap-300">
      {groups.map(([group, values]) => (
        <div key={group} className="flex flex-col gap-gap-100">
          <Typography variant="eyebrow-s-semibold" className="text-text-tertiary">
            {group}
          </Typography>
          {Object.entries(values).map(([key, value]) => (
            <InfoRow key={key} label={humanize(key)} value={formatValue(value)} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** One operator result rendered by output shape. */
export function OperatorResultView({ result }: { result: IntelligenceResult }) {
  const value = result.result as Record<string, unknown> | string | null;
  if (value && typeof value === 'object' && 'label' in value) return <Badge label={String(value.label)} variant="default" />;
  if (value && typeof value === 'object' && 'text' in value) {
    return (
      <Typography as="p" variant="body-s">
        {String(value.text)}
      </Typography>
    );
  }
  if (value && typeof value === 'object') {
    return (
      <div className="flex flex-col">
        {Object.entries(value).map(([key, v]) => (
          <InfoRow key={key} label={humanize(key)} value={formatValue(v)} />
        ))}
      </div>
    );
  }
  return (
    <Typography as="p" variant="body-s">
      {String(value ?? '')}
    </Typography>
  );
}

/** Turns camelCase into a readable label. */
export function humanize(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** The latest sentiment label among a call's Intelligence results. */
export function latestSentiment(results: IntelligenceResult[]): string | undefined {
  const hit = [...results].reverse().find(r => r.operator === 'Sentiment');
  return (hit?.result as { label?: string } | undefined)?.label;
}
