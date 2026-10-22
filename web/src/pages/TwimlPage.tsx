import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Badge } from '@gtmi/strix-react/atoms/badge';
import { Button } from '@gtmi/strix-react/atoms/button';
import { Card } from '@gtmi/strix-react/atoms/card';
import { Input } from '@gtmi/strix-react/atoms/input';
import { Label } from '@gtmi/strix-react/atoms/label';
import { NativeSelect, NativeSelectOption } from '@gtmi/strix-react/atoms/native-select';
import { Textarea } from '@gtmi/strix-react/atoms/textarea';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import { InfoSection } from '@gtmi/strix-react/molecules/info-section';
import { api, type RelayOptions, type RelayPreset } from '../api';

type FieldSpec =
  | { key: string; label: string; kind: 'text'; placeholder?: string; help?: string }
  | { key: string; label: string; kind: 'textarea'; help?: string }
  | { key: string; label: string; kind: 'number'; placeholder?: string; help?: string }
  | { key: string; label: string; kind: 'select'; options: string[]; help?: string }
  | { key: string; label: string; kind: 'bool'; help?: string };

const SECTIONS: { title: string; fields: FieldSpec[] }[] = [
  {
    title: 'Greeting',
    fields: [
      { key: 'welcomeGreeting', label: 'Welcome greeting', kind: 'textarea' },
      { key: 'welcomeGreetingInterruptible', label: 'Greeting interruptible by', kind: 'select', options: ['any', 'speech', 'dtmf', 'none'] },
    ],
  },
  {
    title: 'Language',
    fields: [
      { key: 'language', label: 'Language', kind: 'text', placeholder: 'en-US' },
      { key: 'ttsLanguage', label: 'TTS language (override)', kind: 'text', placeholder: 'en-US' },
      { key: 'transcriptionLanguage', label: 'STT language (override)', kind: 'text', placeholder: 'en-US or multi', help: '"multi" needs Deepgram STT and ElevenLabs TTS.' },
    ],
  },
  {
    title: 'Text-to-speech',
    fields: [
      { key: 'ttsProvider', label: 'TTS provider', kind: 'select', options: ['ElevenLabs', 'Google', 'Amazon'] },
      { key: 'voice', label: 'Voice', kind: 'text', placeholder: 'UgBBYS2sOqTuMpoF3BR0', help: 'ElevenLabs voice id, Google e.g. en-US-Journey-O, Amazon e.g. Joanna-Neural.' },
      { key: 'elevenlabsTextNormalization', label: 'ElevenLabs text normalization', kind: 'select', options: ['off', 'on', 'auto'] },
    ],
  },
  {
    title: 'Speech-to-text',
    fields: [
      { key: 'transcriptionProvider', label: 'STT provider', kind: 'select', options: ['Deepgram', 'Google'] },
      { key: 'speechModel', label: 'Speech model', kind: 'text', placeholder: 'nova-3-general', help: 'Deepgram: nova-3-general, nova-2-general, flux. Google: telephony, long, short.' },
      { key: 'deepgramSmartFormat', label: 'Deepgram smart format', kind: 'bool' },
      { key: 'hints', label: 'Recognition hints', kind: 'textarea', help: 'Comma-separated words and phrases.' },
      { key: 'speechTimeout', label: 'Speech timeout (ms)', kind: 'number', placeholder: 'auto' },
      { key: 'eotThreshold', label: 'End-of-turn threshold', kind: 'number', placeholder: '0.8', help: '0.5–0.9, Deepgram flux only.' },
      { key: 'partialPrompts', label: 'Partial prompts', kind: 'bool', help: 'Deepgram flux only.' },
    ],
  },
  {
    title: 'Interruptions',
    fields: [
      { key: 'interruptible', label: 'Interruptible by', kind: 'select', options: ['any', 'speech', 'dtmf', 'none'] },
      { key: 'interruptSensitivity', label: 'Interrupt sensitivity', kind: 'select', options: ['high', 'medium', 'low'] },
      { key: 'reportInputDuringAgentSpeech', label: 'Report input during agent speech', kind: 'select', options: ['none', 'any', 'speech', 'dtmf'] },
      { key: 'ignoreBackchannel', label: 'Ignore backchannel ("uh-huh")', kind: 'bool' },
      { key: 'preemptible', label: 'Preemptible', kind: 'bool' },
      { key: 'dtmfDetection', label: 'DTMF detection', kind: 'bool' },
    ],
  },
  {
    title: 'Advanced',
    fields: [
      { key: 'events', label: 'Events', kind: 'text', placeholder: 'speaker-events tokens-played' },
      { key: 'debug', label: 'Debug', kind: 'text', placeholder: 'debugging' },
      { key: 'intelligenceService', label: 'Intelligence service (classic)', kind: 'text', help: 'Leave blank: Conversation Intelligence runs through the Orchestrator configuration.' },
    ],
  },
];

const NUMBER_FIELDS = new Set(['speechTimeout', 'eotThreshold']);

/** TwiML builder: edit ConversationRelay attributes, preview the XML, save presets. */
export function TwimlPage() {
  const [presets, setPresets] = useState<RelayPreset[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [options, setOptions] = useState<RelayOptions>({});
  const [twiml, setTwiml] = useState('');
  const [status, setStatus] = useState<string>();

  const load = async (selectId?: string) => {
    const data = await api<{ activeId: string; presets: RelayPreset[] }>('/api/presets');
    setPresets(data.presets);
    setActiveId(data.activeId);
    const pick = data.presets.find(p => p.id === (selectId ?? data.activeId)) ?? data.presets[0];
    if (pick) {
      setEditingId(pick.id);
      setName(pick.name);
      setOptions(pick.options);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void api<{ twiml: string }>('/api/twiml/preview', { method: 'POST', body: { options } }).then(r => setTwiml(r.twiml));
    }, 200);
    return () => clearTimeout(timer);
  }, [options]);

  const set = (key: string, value: string | boolean | undefined) => {
    setOptions(prev => {
      const next = { ...prev };
      if (value === undefined || value === '') delete next[key];
      else next[key] = NUMBER_FIELDS.has(key) && typeof value === 'string' && value !== 'auto' ? Number(value) : value;
      return next;
    });
  };

  const save = async (asNew: boolean, activate: boolean) => {
    const body = { ...(asNew ? {} : { id: editingId }), name: asNew ? `${name} (copy)` : name, options, activate };
    const preset = await api<RelayPreset>('/api/presets', { method: 'POST', body });
    setStatus(activate ? 'Saved and active for the next call' : 'Saved');
    setTimeout(() => setStatus(undefined), 2500);
    await load(preset.id);
  };

  const activate = async (id: string) => {
    await api(`/api/presets/${id}/activate`, { method: 'POST' });
    await load(id);
  };

  const editing = useMemo(() => presets.find(p => p.id === editingId), [presets, editingId]);

  return (
    <div className="mt-gap-400 grid gap-gap-400 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-gap-400">
        <Card padding="md" className="flex flex-col gap-gap-300">
          <div className="flex flex-wrap items-end gap-gap-300">
            <div className="flex min-w-56 flex-1 flex-col gap-gap-100">
              <Label htmlFor="preset-select">Preset</Label>
              <NativeSelect id="preset-select" value={editingId ?? ''} onChange={e => void load(e.target.value)}>
                {presets.map(p => (
                  <NativeSelectOption key={p.id} value={p.id}>
                    {p.name}
                    {p.id === activeId ? ' (active)' : ''}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex min-w-56 flex-1 flex-col gap-gap-100">
              <Label htmlFor="preset-name">Name</Label>
              <Input id="preset-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-gap-200">
            <Button variant="primary" onClick={() => void save(false, true)}>
              Save and use for next call
            </Button>
            <Button variant="secondary" onClick={() => void save(false, false)}>
              Save
            </Button>
            <Button variant="ghost" onClick={() => void save(true, false)}>
              Duplicate
            </Button>
            {editing && editing.id !== activeId && (
              <Button variant="ghost" onClick={() => void activate(editing.id)}>
                Activate
              </Button>
            )}
            {status && <Badge label={status} variant="success" />}
          </div>
        </Card>

        {SECTIONS.map(section => (
          <Card key={section.title} padding="md">
            <InfoSection title={section.title} titleAs="h3">
              <div className="grid gap-gap-300 md:grid-cols-2">
                {section.fields.map(field => (
                  <FieldInput key={field.key} field={field} value={options[field.key]} onChange={v => set(field.key, v)} />
                ))}
              </div>
            </InfoSection>
          </Card>
        ))}
      </div>

      <div className="xl:sticky xl:top-gap-400 xl:self-start">
        <Card padding="md" className="flex flex-col gap-gap-200">
          <div className="flex items-center justify-between gap-gap-200">
            <Typography as="h3" variant="subhead-s">
              TwiML preview
            </Typography>
            <Button variant="ghost" onClick={() => void navigator.clipboard.writeText(twiml)}>
              Copy
            </Button>
          </div>
          <Typography as="p" variant="body-xs" className="text-text-tertiary">
            What the next inbound call receives. url, action and conversationConfiguration come from the server.
          </Typography>
          <Typography as="pre" variant="mono-s-regular" className="max-h-[44rem] overflow-auto whitespace-pre rounded-sm bg-surface-field p-padding-horizontal-sm text-text-secondary">
            {twiml}
          </Typography>
        </Card>
      </div>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: FieldSpec; value: unknown; onChange: (value: string | boolean | undefined) => void }) {
  const id = `relay-${field.key}`;
  let control: ReactNode;
  if (field.kind === 'bool') {
    const state = value === true ? 'true' : value === false ? 'false' : '';
    control = (
      <NativeSelect id={id} value={state} onChange={e => onChange(e.target.value === '' ? undefined : e.target.value === 'true')}>
        <NativeSelectOption value="">Default</NativeSelectOption>
        <NativeSelectOption value="true">On</NativeSelectOption>
        <NativeSelectOption value="false">Off</NativeSelectOption>
      </NativeSelect>
    );
  } else if (field.kind === 'select') {
    control = (
      <NativeSelect id={id} value={value === undefined ? '' : String(value)} onChange={e => onChange(e.target.value)}>
        <NativeSelectOption value="">Default</NativeSelectOption>
        {field.options.map(o => (
          <NativeSelectOption key={o} value={o}>
            {o}
          </NativeSelectOption>
        ))}
      </NativeSelect>
    );
  } else if (field.kind === 'textarea') {
    control = <Textarea id={id} rows={3} value={value === undefined ? '' : String(value)} onChange={e => onChange(e.target.value)} />;
  } else {
    control = (
      <Input
        id={id}
        inputMode={field.kind === 'number' ? 'decimal' : undefined}
        placeholder={field.placeholder}
        value={value === undefined ? '' : String(value)}
        onChange={e => onChange(e.target.value)}
      />
    );
  }
  return (
    <div className={field.kind === 'textarea' ? 'flex flex-col gap-gap-100 md:col-span-2' : 'flex flex-col gap-gap-100'}>
      <Label htmlFor={id}>{field.label}</Label>
      {control}
      {field.help && (
        <Typography variant="body-xs" className="text-text-tertiary">
          {field.help}
        </Typography>
      )}
    </div>
  );
}

