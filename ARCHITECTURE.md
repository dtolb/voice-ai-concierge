# Architecture

How the HVAC concierge is put together, in the order a call happens. Line numbers link into the source; read [`server/src/main.ts`](server/src/main.ts) top to bottom alongside this page, because its numbered sections follow the same steps.

## The pieces

| Piece | Job here |
|---|---|
| **ConversationRelay** | Twilio's speech bridge. Turns the caller's voice into text over a WebSocket and speaks the text the app streams back. No LLM, no memory. |
| **Conversation Orchestrator** | Creates one conversation per customer (`GROUP_BY_PROFILE`) and records every utterance and text in it. Voice calls join it because the TwiML carries `conversationConfiguration`; SMS joins it through capture rules on the number. |
| **Conversation Memory** | The customer profile. The Orchestrator resolves the caller's phone number to a profile; the app writes traits to it; the agent reads it back on the next call. |
| **Conversation Intelligence** | Language operators run against the conversation. One rule scores sentiment on every utterance; another runs Summary, Sentiment and the custom Lead Qualification operator when the conversation closes. Results arrive by webhook. |
| **TAC (`twilio-agent-connect`)** | The SDK that glues the above to the LLM: TwiML generation, the ConversationRelay WebSocket, Twilio signature checks, looking up the Orchestrator conversation and Memory profile for a call, and hang-up. Used as the npm package. |
| **OpenAI Agents SDK** | The LLM loop and its tools. Model and reasoning effort come from `.env`. |
| **This app** | Call records, the prompt and TwiML presets, two agent tools, the Intelligence webhook, and the web UI. State is `data/database.json`. |

## Life of a call

1. **The call arrives.** Twilio posts to `/twiml`. TAC validates the signature and calls the app's customizer ([`main.ts:43`](server/src/main.ts#L43)), which creates a call record and returns the active TwiML preset. TAC merges the preset with the WebSocket URL, the `<Connect action>` URL and `conversationConfiguration`, and answers with `<ConversationRelay>`.
2. **ConversationRelay connects.** It opens the WebSocket to `/ws`; the Orchestrator has already created the conversation. TAC polls the Orchestrator by CallSid, finds the conversation and the customer's Memory profile, and fires `webSocketConnected` ([`main.ts:53`](server/src/main.ts#L53)). The app links the call record to both and loads the profile's traits.
3. **The caller speaks.** ConversationRelay sends each finished utterance as a `prompt`. TAC fetches the caller's memory once per call (`memoryMode: 'once'`) and fires `onMessageReady` ([`main.ts:65`](server/src/main.ts#L65)), which hands the turn to [`handleVoiceTurn`](server/src/turn.ts#L50).
4. **The agent answers.** [`buildAgent`](server/src/agent.ts#L97) composes the active prompt with the caller's Memory context and gives the model two tools. The reply streams token by token through the ZIP-code filter ([`turn.ts:67`](server/src/turn.ts#L67)) into ConversationRelay, which speaks it as it arrives; the time to the first token is recorded per turn.
5. **The agent saves the lead.** When the caller confirms the read-back address, the model calls [`save_customer_details`](server/src/agent.ts#L35), which PATCHes the profile's `Contact` and `HvacService` traits ([`twilio-api.ts:23`](server/src/twilio-api.ts#L23)).
6. **Live sentiment.** Every utterance in the conversation triggers Intelligence rule 1. Sentiment results arrive at `/webhooks/intelligence` ([`intelligence.ts:65`](server/src/intelligence.ts#L65)) a few seconds later, are matched to the call by CallSid, and stream to the Live tab.
7. **The caller barges in.** ConversationRelay stops speaking and sends `interrupt` with what the caller actually heard. [`handleInterrupt`](server/src/turn.ts#L88) rewrites the stored reply to that text, so the model doesn't think it said things the caller never heard.
8. **The agent hangs up.** On the goodbye turn the model calls [`end_call`](server/src/agent.ts#L81). After the goodbye has streamed, [`scheduleHangUp`](server/src/turn.ts#L121) waits for roughly its speaking time plus 1.5 s, then ends the call through the REST API.
9. **The conversation closes.** When the WebSocket drops ([`main.ts:97`](server/src/main.ts#L97)) the app marks the call ended and **closes the Orchestrator conversation** ([`main.ts:103`](server/src/main.ts#L103), [`twilio-api.ts:45`](server/src/twilio-api.ts#L45)). Closing is what fires Intelligence rule 2 (`CONVERSATION_END`). Without it the conversation sits open until the configuration's 5-minute timeout, and the summary arrives that much later.
10. **Post-call intelligence.** Summary, Sentiment and Lead Qualification arrive at the same webhook. The lead result's `purchaseInterest` and rationale are written to the profile ([`intelligence.ts:46`](server/src/intelligence.ts#L46)); its address and reason fill in only if the agent never saved them itself.

SMS follows steps 3 to 5 and 10 through [`handleSmsTurn`](server/src/turn.ts#L33): the reply is returned whole for TAC to send rather than streamed, and the conversation closes on the Orchestrator's own timeout.

## Server files

| File | Responsibility |
|---|---|
| [`main.ts`](server/src/main.ts) | Wiring only: start TAC and the channels, register handlers in call order, mount HTTP routes. |
| [`turn.ts`](server/src/turn.ts) | One voice or SMS turn: chat history, streaming, latency, interruptions, hang-up. |
| [`agent.ts`](server/src/agent.ts) | The OpenAI agent and its two tools. |
| [`calls.ts`](server/src/calls.ts) | Call records: start, end, transcript lines, tool calls, profile snapshot. |
| [`intelligence.ts`](server/src/intelligence.ts) | The Intelligence Rule Execution webhook. |
| [`twilio-api.ts`](server/src/twilio-api.ts) | Twilio calls TAC has no method for: patch profile traits, close a conversation, build the Voice Insights URL. |
| [`routes.ts`](server/src/routes.ts) | The JSON API for the web app, including the TwiML preview, which is rendered by TAC's own builder so it matches what Twilio receives. |
| [`events.ts`](server/src/events.ts) | Server-sent events to the browser. |
| [`db.ts`](server/src/db.ts) | `database.json`: calls, prompt versions, TwiML presets. |
| [`twiml.ts`](server/src/twiml.ts), [`prompt.ts`](server/src/prompt.ts) | The seed TwiML preset and system prompt. |
| [`speech.ts`](server/src/speech.ts) | ZIP-code digit spelling and the speaking-time estimate. |

The web app is one file per tab under [`web/src/pages/`](web/src/pages), with [`api.ts`](web/src/api.ts) for types and fetches and [`shared.tsx`](web/src/pages/shared.tsx) for the transcript, profile and Intelligence views the tabs share. Components and tokens come from Strix (`@gtmi/strix-react`).

## Twilio objects and why they are configured this way

All created and updated by [`scripts/provision.py`](scripts/provision.py), whose spec sits at the top of the file as plain data.

- **No voice capture rules on the Orchestrator configuration** ([`provision.py:430`](scripts/provision.py#L430)). ConversationRelay already transcribes the call and `conversationConfiguration` on the TwiML routes it into the conversation. A voice capture rule would start a second transcription and bill speech-to-text twice.
- **SMS capture rules go both ways** (`*` → number and number → `*`), so outbound replies thread into the same conversation as inbound texts.
- **Two Intelligence rules** ([`provision.py:365`](scripts/provision.py#L365)): `COMMUNICATION` for per-utterance sentiment, `CONVERSATION_END` for the post-call operators, with Memory context so Lead Qualification can see the profile.
- **The `HvacService` trait group** ([`provision.py:63`](scripts/provision.py#L63)) must exist before the app can write those traits; Memory rejects traits that are not in the store's schema.
- **Lead Qualification** ([`provision.py:77`](scripts/provision.py#L77)) is a custom JSON operator. Its enums use `UNKNOWN` rather than null, because the operator schema does not accept nullable enums.

## Choices worth knowing

- **Purchase interest comes from Intelligence, not the agent.** The agent captures facts the caller states; judging interest is left to an operator that reads the whole call afterwards.
- **`twilio-api.ts` calls the REST API directly** because TAC's Memory client reads profiles but has no trait PATCH, and its conversation client is not exposed for closing.
- **Hang-up is a timer, not an event.** ConversationRelay can report when the agent stops speaking (`speaker-events`), but TAC 2.4 does not pass those messages to the app, so the app estimates speaking time instead.
- **ZIP codes are spelled in code as well as in the prompt**, because a model instruction alone is not reliable and the text-to-speech engine reads five-digit numbers as quantities.
- **Reasoning effort is `low`.** `none` skipped the address question and saved details before the caller confirmed them; `minimal` is not supported by the configured model.
- **Latency shown in the app is app-side only** (first token after the prompt arrives). Speech-to-text, text-to-speech and network time per turn are in Voice Insights, linked from every call.
