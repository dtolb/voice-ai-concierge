# HVAC concierge

A demo AI concierge for a small HVAC business ("Summit Heating & Air"). Callers and texters reach an OpenAI agent through Twilio ConversationRelay and SMS; Conversation Orchestrator threads both channels into one conversation per customer; Conversation Intelligence scores sentiment live and qualifies the lead after the call; Conversation Memory holds the customer profile.

Live at `https://hvac-concierge.twilio.dtolb.com` (Traefik dev box). Call or text **+1 (234) 635-3817**.

[`ARCHITECTURE.md`](ARCHITECTURE.md) walks a call through the code step by step. The public teaching page, with a clickable topology and hop-by-hop call flows, is [pages-4296.twil.io/inbound-voice-ai-concierge](https://pages-4296.twil.io/inbound-voice-ai-concierge); its source is `docs/page/`, assembled from `docs/page/.build/` fragments (`gen_flows.py` writes the ladders).

## What a call does

1. `/twiml` answers with `<ConversationRelay>` built from the active TwiML preset, with `conversationConfiguration` set so the call lands in the Orchestrator.
2. Each caller utterance goes to the agent (OpenAI Agents SDK, streamed token by token back to ConversationRelay). The prompt asks for name, reason and service address, reads the address back, and on confirmation calls `save_customer_details`, which PATCHes the Memory profile (`Contact` + `HvacService` trait groups).
3. Intelligence rule 1 runs Sentiment on every utterance; results arrive at `/webhooks/intelligence` and show live.
4. On hangup the app closes the conversation, which fires rule 2: Summary, Sentiment and the custom **HVAC Lead Qualification** operator. Its `purchaseInterest` (HIGH/MEDIUM/LOW) and rationale are written to the profile.

## Web app

| Tab | What it does |
|---|---|
| Live | Streaming transcript, live sentiment, profile traits, tool calls and post-call results for the current call |
| Call history | Every call with transcript, Intelligence results, profile snapshot, app-measured latency and a **View Insights** link into the Twilio Console |
| Prompt | Edit the system prompt; each save is a version you can reactivate |
| TwiML builder | Every ConversationRelay attribute, a live TwiML preview, and named presets; the active preset is used for the next inbound call |

## Running

```bash
CORP_CA_PATH="$HOME/.config/zscaler-root.crt" docker compose up -d --build   # deploy
npm run dev                                                                  # server on :8000, reads .env
npm run dev:web                                                              # Vite on :5173, proxies /api
```

State is `data/database.json` (calls, prompt versions, presets), mounted into the container.

## Twilio objects

`scripts/provision.py` owns every Twilio object the demo uses and is idempotent: it finds each `hvac-concierge-*` object by name, creates what is missing, updates what drifted, and writes ids to `.env`.

```bash
uv run scripts/provision.py plan      # dry run
uv run scripts/provision.py apply     # create/update; --public-host to repoint webhooks
uv run scripts/provision.py status    # live state
uv run scripts/provision.py reset --calls   # delete every Memory profile and clear call history (demo reset)
uv run scripts/provision.py destroy --yes
```

`provision/state.json` records each object's id and applied spec; `provision/requests.jsonl` logs every request.

| Object | Notes |
|---|---|
| Memory Store `hvac-concierge-memory` | `HvacService` trait group alongside the default `Contact` |
| Operator `HVAC Lead Qualification` | JSON; name, address, reason, service type, urgency, purchase interest + rationale, next step |
| Intelligence config `hvac-concierge-intelligence` | Rule 1 `COMMUNICATION`: Sentiment. Rule 2 `CONVERSATION_END`: Summary, Sentiment, Lead Qualification |
| Orchestrator config `hvac-concierge` | `GROUP_BY_PROFILE`; two-way SMS capture rules; no voice capture rules (ConversationRelay already transcribes, a rule would bill STT twice) |
| +12346353817 | Voice URL → `/twiml`; stays in the 10DLC Messaging Service `MG2646…` |

`scripts/smoke-agent.ts` runs a scripted HVAC caller through the agent without a phone call: `node --env-file=.env --experimental-strip-types scripts/smoke-agent.ts`.
# voice-ai-concierge
