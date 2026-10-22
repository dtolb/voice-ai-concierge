import { useEffect, useState } from 'react';
import { Badge } from '@gtmi/strix-react/atoms/badge';
import { Button } from '@gtmi/strix-react/atoms/button';
import { Card } from '@gtmi/strix-react/atoms/card';
import { Input } from '@gtmi/strix-react/atoms/input';
import { Label } from '@gtmi/strix-react/atoms/label';
import { Textarea } from '@gtmi/strix-react/atoms/textarea';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import { cn } from '@gtmi/strix-react/cn';
import { api, formatTime, type PromptVersion } from '../api';

/** Prompt editor: edit the system prompt, save it as a version, switch versions. */
export function PromptPage() {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async () => {
    const data = await api<{ activeId: string; versions: PromptVersion[] }>('/api/prompts');
    setVersions(data.versions);
    setActiveId(data.activeId);
    const active = data.versions.find(v => v.id === data.activeId);
    if (active) setText(active.text);
  };

  useEffect(() => {
    void load();
  }, []);

  const active = versions.find(v => v.id === activeId);
  const dirty = active !== undefined && text !== active.text;

  const save = async () => {
    await api('/api/prompts', { method: 'POST', body: { text, label } });
    setLabel('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await load();
  };

  const activate = async (id: string) => {
    await api(`/api/prompts/${id}/activate`, { method: 'POST' });
    await load();
  };

  return (
    <div className="mt-gap-400 grid gap-gap-400 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card padding="md" className="flex flex-col gap-gap-300">
        <div className="flex flex-wrap items-center justify-between gap-gap-200">
          <Typography as="h2" variant="h5">
            System prompt
          </Typography>
          {active && <Badge label={`Active: ${active.label}`} variant="success" />}
        </div>
        <Typography as="p" variant="body-s" className="text-text-secondary">
          Applies to the next call or text. Memory traits and recent summaries are appended automatically.
        </Typography>
        <Textarea value={text} onChange={e => setText(e.target.value)} rows={26} resize="vertical" className="font-mono" />
        <div className="flex flex-wrap items-end gap-gap-300">
          <div className="flex min-w-60 flex-1 flex-col gap-gap-100">
            <Label htmlFor="prompt-label">Version label</Label>
            <Input id="prompt-label" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Shorter replies" />
          </div>
          <Button variant="primary" disabled={!dirty} onClick={() => void save()}>
            Save and activate
          </Button>
          {saved && <Badge label="Saved" variant="success" />}
        </div>
      </Card>

      <Card padding="none" className="flex max-h-[48rem] flex-col overflow-y-auto">
        <Typography as="h3" variant="subhead-s" className="px-padding-horizontal-md py-padding-vertical-sm">
          Versions
        </Typography>
        {versions.map(v => (
          <div
            key={v.id}
            className={cn('flex items-center justify-between gap-gap-200 border-t border-border-neutral-soft px-padding-horizontal-md py-padding-vertical-sm', v.id === activeId && 'bg-surface-tertiary')}
          >
            <div className="flex flex-col">
              <Typography variant="body-s-semibold">{v.label}</Typography>
              <Typography variant="body-xs" className="text-text-tertiary">
                {formatTime(v.createdAt)}
              </Typography>
            </div>
            {v.id === activeId ? (
              <Badge size="small" label="Active" variant="success" />
            ) : (
              <div className="flex gap-gap-100">
                <Button variant="ghost" onClick={() => setText(v.text)}>
                  Load
                </Button>
                <Button variant="secondary" onClick={() => void activate(v.id)}>
                  Activate
                </Button>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
