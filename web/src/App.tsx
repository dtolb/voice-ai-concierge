import { useEffect, useState } from 'react';
import { Tabs } from '@gtmi/strix-react/atoms/tabs';
import { Typography } from '@gtmi/strix-react/atoms/typography';
import { Badge } from '@gtmi/strix-react/atoms/badge';
import { api, type AppConfig } from './api';
import { LivePage } from './pages/LivePage';
import { HistoryPage } from './pages/HistoryPage';
import { PromptPage } from './pages/PromptPage';
import { TwimlPage } from './pages/TwimlPage';

/** The single-page app shell: header plus the four work tabs. */
export function App() {
  const [config, setConfig] = useState<AppConfig>();
  const [tab, setTab] = useState('live');
  const [openCallId, setOpenCallId] = useState<string>();

  useEffect(() => {
    void api<AppConfig>('/api/config').then(setConfig);
  }, []);

  const openCall = (id: string) => {
    setOpenCallId(id);
    setTab('history');
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-gap-500 px-padding-horizontal-md py-padding-vertical-lg">
      <header className="flex flex-wrap items-end justify-between gap-gap-300">
        <div className="flex flex-col gap-gap-100">
          <Typography variant="eyebrow-s-semibold" className="text-text-tertiary">
            Twilio · ConversationRelay · Conversation Intelligence · Memory
          </Typography>
          <Typography as="h1" variant="h4">
            Summit Heating &amp; Air concierge
          </Typography>
        </div>
        {config && (
          <div className="flex flex-wrap items-center gap-gap-200">
            <Badge label={`Call or text ${formatPhone(config.phoneNumber)}`} variant="brand20" />
            <Badge label={config.model} variant="neutral" />
          </div>
        )}
      </header>
      <Tabs
        value={tab}
        onValueChange={setTab}
        aria-label="Concierge views"
        rootClassName="w-full"
        panelClassName="w-full"
        items={[
          { value: 'live', label: 'Live', content: <LivePage onOpenCall={openCall} /> },
          { value: 'history', label: 'Call history', content: <HistoryPage openCallId={openCallId} onSelect={setOpenCallId} /> },
          { value: 'prompt', label: 'Prompt', content: <PromptPage /> },
          { value: 'twiml', label: 'TwiML builder', content: <TwimlPage /> },
        ]}
      />
    </div>
  );
}

function formatPhone(e164: string): string {
  const d = e164.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : e164;
}
