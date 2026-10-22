  <div class="wide" id="nodepanels">
    <div class="node-detail" id="d-caller" hidden style="--acc:#2E7D5B">
      <h4>Caller</h4>
      <dl>
        <dt>What</dt><dd>A homeowner on any phone, calling or texting one US local number.</dd>
        <dt>Why here</dt><dd>The caller's phone number is the identifier that ties a call, a text and a returning caller to one customer profile.</dd>
        <dt>Talks to</dt><dd>The Twilio number over the PSTN, for voice and SMS.</dd>
        <dt>Constraint</dt><dd>SMS from a US local number needs an approved A2P 10DLC campaign. The demo number sits in a Messaging Service that already has one.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-relay" hidden style="--acc:#2E6FA3">
      <h4>ConversationRelay</h4>
      <dl>
        <dt>What</dt><dd>The <code>&lt;ConversationRelay&gt;</code> TwiML noun. Twilio transcribes the caller, sends each finished utterance to a WebSocket as a <code>prompt</code> message, and speaks the <code>text</code> tokens the application streams back.</dd>
        <dt>Why here</dt><dd>It removes audio handling from the application entirely. Speech-to-text, text-to-speech, barge-in detection and endpointing are all Twilio's, and each is a TwiML attribute the demo's TwiML builder can change per call.</dd>
        <dt>Talks to</dt><dd>The application's <code>/twiml</code> webhook once per call and its <code>/ws</code> WebSocket for the rest of it. With <code>conversationConfiguration</code> set, it also writes the transcript into the Orchestrator.</dd>
        <dt>Constraint</dt><dd>One session per call. Interrupt messages report what the caller had heard when they barged in, which the application has to use to rewrite its own chat history.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-orch" hidden style="--acc:#2E6FA3">
      <h4>Conversation Orchestrator</h4>
      <dl>
        <dt>What</dt><dd>A conversation configuration that groups communications by customer profile. Every voice utterance, agent reply and text message lands in one conversation.</dd>
        <dt>Why here</dt><dd>It is the join between channels and the trigger for Intelligence. Memory resolves the caller to a profile through it, and Intelligence rules fire on its events.</dd>
        <dt>Talks to</dt><dd>ConversationRelay for voice, capture rules on the number for SMS, Memory for the profile, Intelligence for rule execution, and the application's <code>/webhook</code> for conversation events.</dd>
        <dt>Constraint</dt><dd>A conversation stays open until it is closed or times out. End-of-call rules do not fire until it closes.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-memory" hidden style="--acc:#2E7D5B">
      <h4>Conversation Memory</h4>
      <dl>
        <dt>What</dt><dd>A memory store with the default <code>Contact</code> trait group and a custom <code>HvacService</code> group: reason for calling, service type, service address, address confirmed, purchase interest and its rationale, urgency, last call.</dd>
        <dt>Why here</dt><dd>The agent reads the profile at the start of a call, so a returning caller is not asked for their address twice, and the business reads it afterwards as the lead record.</dd>
        <dt>Talks to</dt><dd>The Orchestrator, which resolves the caller's phone number to a profile; the application, which reads and patches traits; Intelligence, which reads the profile as operator context.</dd>
        <dt>Constraint</dt><dd>A trait can only be written if it is declared in the store's trait group schema first.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-intel" hidden style="--acc:#2E6FA3">
      <h4>Conversation Intelligence</h4>
      <dl>
        <dt>What</dt><dd>An intelligence configuration with two rules. Rule one runs Twilio's Sentiment operator on every communication. Rule two runs Summary, Sentiment and a custom HVAC Lead Qualification operator when the conversation closes.</dd>
        <dt>Why here</dt><dd>It gives the business an independent read of the call. The lead operator judges purchase interest from the whole transcript, which the agent is never asked to do mid-call.</dd>
        <dt>Talks to</dt><dd>The Orchestrator for triggers and transcript, Memory for context, and the application's <code>/webhooks/intelligence</code> for results.</dd>
        <dt>Constraint</dt><dd>Per-utterance results arrive a few seconds after the utterance. End-of-call results arrive a few seconds after the conversation closes, not after the caller hangs up.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-tac" hidden style="--acc:#C42B72">
      <h4>Agent server on Twilio Agent Connect</h4>
      <dl>
        <dt>What</dt><dd>A Node service built on the <code>twilio-agent-connect</code> SDK. The SDK answers the webhooks, validates Twilio signatures, runs the ConversationRelay WebSocket, and looks up the conversation and profile for each call. The application adds the agent turn, two tools, and the Intelligence webhook.</dd>
        <dt>Why here</dt><dd>It is the only part you build. Everything about carrying the call is the platform's; everything about what the agent says and remembers is here.</dd>
        <dt>Talks to</dt><dd>ConversationRelay, OpenAI, Memory and the Orchestrator through REST, and the web console.</dd>
        <dt>Constraint</dt><dd>Needs a public HTTPS and WSS hostname that Twilio can reach.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-store" hidden style="--acc:#C42B72">
      <h4>Call records, prompts and TwiML presets</h4>
      <dl>
        <dt>What</dt><dd>One JSON file: every call's transcript, tool calls, latency and Intelligence results; versioned system prompts; named sets of ConversationRelay attributes.</dd>
        <dt>Why here</dt><dd>It lets the demo change the prompt or the voice between calls and compare the results, without redeploying.</dd>
        <dt>Talks to</dt><dd>The agent server only.</dd>
        <dt>Constraint</dt><dd>A demo store for a handful of users, not a database.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-ui" hidden style="--acc:#C42B72">
      <h4>Web console</h4>
      <dl>
        <dt>What</dt><dd>A single-page app with four tabs: a live view of the current call, call history, a prompt editor and a TwiML builder with a live preview.</dd>
        <dt>Why here</dt><dd>It makes each product's contribution visible while a call is in progress: the transcript, the sentiment, the profile filling in, and the post-call results.</dd>
        <dt>Talks to</dt><dd>The agent server's JSON API and its server-sent event stream. Each call links out to Voice Insights in the Twilio Console.</dd>
        <dt>Constraint</dt><dd>Shows latency measured by the application only. Speech-to-text, text-to-speech and network time per turn are in Voice Insights.</dd>
      </dl>
    </div>
    <div class="node-detail" id="d-llm" hidden style="--acc:#C42B72">
      <h4>OpenAI, through the Agents SDK</h4>
      <dl>
        <dt>What</dt><dd>The model, called through the OpenAI Agents SDK with streaming and two tools: <code>save_customer_details</code> and <code>end_call</code>.</dd>
        <dt>Why here</dt><dd>The customer's own LLM. Agent Connect is model-agnostic; this demo uses OpenAI because that is what the customer runs.</dd>
        <dt>Talks to</dt><dd>The agent server only.</dd>
        <dt>Constraint</dt><dd>Time to first token is most of the caller's perceived wait. Tool calls add a second model round trip to the turn they happen in.</dd>
      </dl>
    </div>
  </div>
