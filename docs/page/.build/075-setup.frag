  <div class="sec-head" id="setup"><span class="num"><b>03</b></span><h2>Setting this up in your own Twilio account, voice only</h2></div>

  <p>The demo provisions everything with one script, but every step below can be done in the Console or the REST API, and the order matters. Each object refers to the one before it by ID: a conversation configuration names its memory store and its intelligence configurations, a rule names its operators, and the TwiML names the conversation configuration. Build from the bottom of that chain up and nothing has to be edited twice. Messaging is out of scope here; it adds capture rules and a status callback to the same configuration and is covered separately.</p>

  <div class="wide">
    <div class="topo deps">
      <svg viewBox="0 0 1180 300" role="img" aria-label="Order of setup: addendum, memory store, trait group, operator, intelligence configuration, conversation configuration, application, phone number">
        <defs>
          <marker id="ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#A8B7C0"></path>
          </marker>
        </defs>
        <text class="glabel" x="14" y="28">ACCOUNT</text>
        <text class="glabel" x="196" y="28">MEMORY</text>
        <text class="glabel" x="420" y="28">INTELLIGENCE</text>
        <text class="glabel" x="660" y="28">ORCHESTRATOR</text>
        <text class="glabel" x="880" y="28">YOUR APP AND NUMBER</text>

        <rect class="gbox" x="14" y="36" width="160" height="250"></rect>
        <rect class="gbox" x="196" y="36" width="202" height="250"></rect>
        <rect class="gbox" x="420" y="36" width="218" height="250"></rect>
        <rect class="gbox" x="660" y="36" width="198" height="250"></rect>
        <rect class="gbox" x="880" y="36" width="286" height="250"></rect>

        <g><rect x="28" y="70" width="132" height="54" fill="#fff" stroke="#2E6FA3" stroke-width="1.5"></rect>
          <text class="nlabel" x="40" y="93">AI/ML addendum</text><text class="nsub" x="40" y="110">STEP 1</text></g>
        <g><rect x="28" y="196" width="132" height="54" fill="#fff" stroke="#2E6FA3" stroke-width="1.5"></rect>
          <text class="nlabel" x="40" y="219">Standard API key</text><text class="nsub" x="40" y="236">STEP 1</text></g>

        <g><rect x="210" y="70" width="174" height="54" fill="#fff" stroke="#2E7D5B" stroke-width="1.5"></rect>
          <text class="nlabel" x="222" y="93">Memory store</text><text class="nsub" x="222" y="110">STEP 2, ASYNC</text></g>
        <g><rect x="210" y="196" width="174" height="54" fill="#fff" stroke="#2E7D5B" stroke-width="1.5"></rect>
          <text class="nlabel" x="222" y="219">Trait group schema</text><text class="nsub" x="222" y="236">STEP 3, ASYNC</text></g>

        <g><rect x="434" y="70" width="190" height="54" fill="#fff" stroke="#2E6FA3" stroke-width="1.5"></rect>
          <text class="nlabel" x="446" y="93">Custom operator</text><text class="nsub" x="446" y="110">STEP 4</text></g>
        <g><rect x="434" y="196" width="190" height="54" fill="#fff" stroke="#2E6FA3" stroke-width="1.5"></rect>
          <text class="nlabel" x="446" y="219">Intelligence config</text><text class="nsub" x="446" y="236">STEP 5, RULES</text></g>

        <g><rect x="674" y="133" width="170" height="54" fill="#fff" stroke="#2E6FA3" stroke-width="1.5"></rect>
          <text class="nlabel" x="686" y="156">Conversation config</text><text class="nsub" x="686" y="173">STEP 6, ASYNC</text></g>

        <g><rect x="894" y="70" width="258" height="54" fill="#fff" stroke="#C42B72" stroke-width="1.5"></rect>
          <text class="nlabel" x="906" y="93">Agent server, public WSS</text><text class="nsub" x="906" y="110">STEP 7</text></g>
        <g><rect x="894" y="196" width="258" height="54" fill="#fff" stroke="#C42B72" stroke-width="1.5"></rect>
          <text class="nlabel" x="906" y="219">Phone number voice URL</text><text class="nsub" x="906" y="236">STEP 8, THEN TEST IN 9</text></g>

        <path class="edge" d="M297,124 L297,196" marker-end="url(#ar2)"></path>
        <text class="elabel" x="304" y="164">storeId</text>
        <path class="edge" d="M529,124 L529,196" marker-end="url(#ar2)"></path>
        <text class="elabel" x="536" y="164">operator id</text>
        <path class="edge" d="M384,97 L404,97 L404,150 L674,150" marker-end="url(#ar2)"></path>
        <text class="elabel" x="560" y="144">memoryStoreId</text>
        <path class="edge" d="M624,223 L650,223 L650,172 L674,172" marker-end="url(#ar2)"></path>
        <text class="elabel" x="540" y="270">intelligenceConfigurationIds</text>
        <path class="edge" d="M844,160 L868,160 L868,97 L894,97" marker-end="url(#ar2)"></path>
        <text class="elabel" x="870" y="140">conversationConfiguration</text>
        <path class="edge" d="M1023,124 L1023,196" marker-end="url(#ar2)"></path>
        <text class="elabel" x="1030" y="164">/twiml URL</text>
        <path class="edge dash" d="M160,97 L210,97" marker-end="url(#ar2)"></path>
      </svg>
    </div>
    <p class="hint">Each arrow is an ID or URL the next object needs. Steps marked async return a status URL to poll before the object can be used.</p>
  </div>

  <div class="setup wide">

    <div class="sstep" style="--acc:#2E6FA3">
      <div class="shead"><span class="sn">STEP 01</span><h3>Accept the AI/ML addendum and create a standard API key</h3><span class="where">Console, once per account</span></div>
      <p>ConversationRelay, the Orchestrator, Memory and Intelligence are all subject to the Predictive and Generative AI/ML Features Addendum. In the Console, open <b>Voice &gt; Settings &gt; Privacy &amp; Security</b>, accept it, and save. The ConversationRelay documentation lists it as a prerequisite to using the noun at all.</p>
      <p>Create a <b>standard</b> API key under <b>API keys &amp; tokens</b>. The Conversations APIs take the key SID and secret as Basic auth; the Agent Connect SDK also needs the account's Auth Token to validate webhook signatures.</p>
      <div class="reflinks"><a href="https://www.twilio.com/docs/voice/conversationrelay/onboarding">ConversationRelay onboarding</a><a href="https://www.twilio.com/docs/conversations/agent-connect/quickstart">Agent Connect quickstart</a></div>
      <p class="gotcha"><b>Key type matters.</b> The Agent Connect quickstart specifies a standard key. A restricted key works only for the resources it was granted and fails elsewhere with an authorization error, so prove a key against an endpoint it covers before debugging anything else.</p>
    </div>

    <div class="sstep" style="--acc:#2E7D5B">
      <div class="shead"><span class="sn">STEP 02</span><h3>Create the memory store</h3><span class="where">Memory API or Console</span></div>
      <p>The store holds customer profiles and the identity rules that match a caller to one. Create it first, because the conversation configuration names it and cannot resolve profiles without it.</p>
<pre>POST https://memory.twilio.com/v1/ControlPlane/Stores
{ "displayName": "hvac-concierge-memory", "description": "HVAC concierge demo" }
<i># 202 Accepted: { "message": ..., "statusUrl": ... }</i></pre>
      <p>The create is asynchronous and the response carries no store ID. Poll the <code>statusUrl</code> until it completes, then list stores and match on <code>displayName</code> to get the <code>mem_store_</code> ID. A new store comes with a <code>Contact</code> trait group and identity rules for <code>phone</code>, <code>email</code> and <code>chat</code>. The <code>phone</code> rule is what links a caller's number to a profile.</p>
      <div class="reflinks"><a href="https://www.twilio.com/docs/api/memory/store/create-store">Create a memory store</a><a href="https://www.twilio.com/docs/conversations/memory/key-terms">Memory key terms</a></div>
    </div>

    <div class="sstep" style="--acc:#2E7D5B">
      <div class="shead"><span class="sn">STEP 03</span><h3>Declare the traits you will write</h3><span class="where">Memory API or Console</span></div>
      <p>Memory accepts only traits that are declared in one of the store's trait groups. The default <code>Contact</code> group already covers name, phone and street address. Anything specific to the business goes in a new group before the application tries to write it.</p>
<pre>POST https://memory.twilio.com/v1/ControlPlane/Stores/{storeId}/TraitGroups
{ "displayName": "HvacService",
  "traits": {
    "reasonForCalling": { "dataType": "STRING" },
    "serviceAddress":   { "dataType": "STRING" },
    "addressConfirmed": { "dataType": "BOOLEAN" },
    "purchaseInterest": { "dataType": "STRING" } } }</pre>
      <div class="reflinks"><a href="https://www.twilio.com/docs/api/memory/trait-group/create-trait-group">Create a trait group</a><a href="https://www.twilio.com/docs/api/memory/profile/patch-profile-traits">Patch profile traits</a></div>
      <p class="gotcha"><b>Plan groups before you create them.</b> A trait cannot be moved from one group to another later, and <code>dataType</code> values are uppercase.</p>
    </div>

    <div class="sstep" style="--acc:#2E6FA3">
      <div class="shead"><span class="sn">STEP 04</span><h3>Create any custom language operators</h3><span class="where">Intelligence API or Console</span></div>
      <p>Twilio-authored operators such as Sentiment and Summary already exist on every account; list them to get their IDs. A custom operator is a prompt plus an output format. The demo's lead qualification operator returns JSON against a schema, with Memory context enabled so it can see the customer profile.</p>
<pre>POST https://intelligence.twilio.com/v3/ControlPlane/Operators
{ "displayName": "HVAC Lead Qualification", "author": "SELF",
  "outputFormat": "JSON", "outputSchema": { "type": "object", "properties": { ... } },
  "prompt": "You analyze a phone call ...",
  "context": { "memory": { "enabled": true } } }</pre>
      <div class="reflinks"><a href="https://www.twilio.com/docs/conversations/intelligence/create-custom-language-operators">Create custom operators</a></div>
      <p class="gotcha"><b>Schema limits.</b> The output schema is a structured-output schema: no <code>minLength</code>, no <code>pattern</code>, and no nullable enums. Use an explicit value such as <code>UNKNOWN</code> for absence.</p>
    </div>

    <div class="sstep" style="--acc:#2E6FA3">
      <div class="shead"><span class="sn">STEP 05</span><h3>Create the intelligence configuration and its rules</h3><span class="where">Intelligence API or Console</span></div>
      <p>An intelligence configuration is a list of rules, and each rule is a trigger, up to five operators, optional context and a webhook action. The demo uses two:</p>
      <ul>
        <li><b>Live:</b> trigger <code>COMMUNICATION</code> with <code>count: 1</code>, operator Sentiment. Fires on every turn.</li>
        <li><b>Post-call:</b> trigger <code>CONVERSATION_END</code>, operators Summary, Sentiment and Lead Qualification, Memory context on.</li>
      </ul>
      <p>Both post to the application's <code>/webhooks/intelligence</code>. The payload carries the conversation ID, each operator's result, and reference IDs that include the CallSid, which is how the application matches a result to a call.</p>
      <div class="reflinks"><a href="https://www.twilio.com/docs/conversations/intelligence/create-intelligence-configuration">Create an intelligence configuration</a><a href="https://www.twilio.com/docs/conversations/intelligence/define-rules">Define rules</a><a href="https://www.twilio.com/docs/conversations/intelligence/integrate-results-with-application">Rule execution webhook</a></div>
      <p class="gotcha"><b>The webhook URL is fixed at creation.</b> Create the configuration with the application's final public hostname, or update it once the hostname is known. Updates are a full replacement of the rules list.</p>
    </div>

    <div class="sstep" style="--acc:#2E6FA3">
      <div class="shead"><span class="sn">STEP 06</span><h3>Create the conversation configuration</h3><span class="where">Conversations API or Console</span></div>
      <p>This is the object the call is routed into, and it ties the others together.</p>
<pre>POST https://conversations.twilio.com/v2/ControlPlane/Configurations
{ "displayName": "hvac-concierge",
  "conversationGroupingType": "GROUP_BY_PROFILE",
  "memoryStoreId": "mem_store_...",
  "intelligenceConfigurationIds": [ "intelligence_configuration_..." ],
  "channelSettings": { "VOICE": { "captureRules": [] } } }
<i># 202 Accepted: poll statusUrl, then list configurations and match displayName</i></pre>
      <ul>
        <li><b>Grouping:</b> <code>GROUP_BY_PROFILE</code> keeps a customer's calls, and later their texts, in one conversation. It cannot be changed after creation.</li>
        <li><b>No voice capture rules.</b> With ConversationRelay the call joins the conversation through the TwiML in step 8. A capture rule on the same number starts a second transcription and bills speech-to-text twice.</li>
        <li><b>Voice timeouts left null.</b> The conversation then closes when the call's transcription stream ends, which fires the <code>CONVERSATION_END</code> rule.</li>
      </ul>
      <div class="reflinks"><a href="https://www.twilio.com/docs/conversations/orchestrator/quickstart">Orchestrator quickstart</a><a href="https://www.twilio.com/docs/conversations/orchestrator/concepts/core">Core concepts and grouping</a><a href="https://www.twilio.com/docs/conversations/orchestrator/concepts/ingestion">Ingestion modes</a><a href="https://www.twilio.com/docs/conversations/orchestrator/concepts/lifecycle">Conversation lifecycle</a></div>
      <p class="gotcha"><b>The Orchestrator quickstart is written for passive capture.</b> Its Console steps tick <b>Set up automatic capture</b> on the voice number. For a ConversationRelay number, leave that box clear, or remove the rule afterwards.</p>
    </div>

    <div class="sstep" style="--acc:#C42B72">
      <div class="shead"><span class="sn">STEP 07</span><h3>Run the agent server on a public hostname</h3><span class="where">Your infrastructure</span></div>
      <p>Twilio has to reach the application over HTTPS for the TwiML webhook and over WSS for the ConversationRelay socket. The Agent Connect SDK reads its configuration from environment variables:</p>
<pre>TWILIO_ACCOUNT_SID   TWILIO_AUTH_TOKEN   TWILIO_API_KEY   TWILIO_API_SECRET
TWILIO_PHONE_NUMBER
TWILIO_CONVERSATION_CONFIGURATION_ID   <i># from step 6</i>
TWILIO_VOICE_PUBLIC_DOMAIN             <i># hostname only, no https://</i></pre>
      <p>On startup the SDK reads the conversation configuration to learn its memory store, so the store ID does not need its own variable. It serves <code>/twiml</code>, the <code>/ws</code> WebSocket, the <code>&lt;Connect action&gt;</code> callback and the call status callback, and validates the Twilio signature on each.</p>
      <div class="reflinks"><a href="https://www.twilio.com/docs/conversations/agent-connect/quickstart">Agent Connect quickstart</a><a href="https://www.twilio.com/docs/voice/conversationrelay/websocket-messages">WebSocket messages</a></div>
      <p class="gotcha"><b>Signature validation depends on the public URL.</b> Behind a proxy, the SDK rebuilds the URL from <code>X-Forwarded-Proto</code> and <code>X-Forwarded-Host</code>. If the proxy rewrites either, every webhook is rejected with a 403.</p>
    </div>

    <div class="sstep" style="--acc:#C42B72">
      <div class="shead"><span class="sn">STEP 08</span><h3>Point the phone number at the application</h3><span class="where">Console or Phone Numbers API</span></div>
      <p>Set the number's voice URL to <code>https://your-host/twiml</code> with method POST. The SDK answers with TwiML along these lines, which is the step that puts the call into the conversation configuration:</p>
<pre>&lt;Response&gt;
  &lt;Connect action="https://your-host/conversation-relay-callback"&gt;
    &lt;ConversationRelay url="wss://your-host/ws"
      conversationConfiguration="conv_configuration_..."
      welcomeGreeting="Thanks for calling ..."
      ttsProvider="ElevenLabs" transcriptionProvider="Deepgram" /&gt;
  &lt;/Connect&gt;
&lt;/Response&gt;</pre>
      <p><code>conversationConfiguration</code> creates or resolves a conversation through the grouping rules. Passing <code>conversationId</code> instead joins a specific existing conversation and bypasses grouping, which is how a later handoff to a human keeps the whole call in one conversation.</p>
      <div class="reflinks"><a href="https://www.twilio.com/docs/voice/twiml/connect/conversationrelay">&lt;ConversationRelay&gt; reference</a><a href="https://www.twilio.com/docs/conversations/orchestrator/concepts/ingestion">Active TwiML for voice</a></div>
    </div>

    <div class="sstep" style="--acc:#2E7D5B">
      <div class="shead"><span class="sn">STEP 09</span><h3>Test without a phone call, then with one</h3><span class="where">Verification</span></div>
      <ul>
        <li><b>Signed webhook first.</b> Send a simulated, signed voice webhook to <code>/twiml</code> and confirm a 200 with the expected TwiML. This proves the hostname, the signature check and the configuration ID without placing a billed call.</li>
        <li><b>One real call.</b> Then list conversations under the configuration. Expect one conversation with two participants, the caller as <code>CUSTOMER</code> with a <code>profileId</code> and the number as <code>AGENT</code>, and one communication per turn.</li>
        <li><b>After hang-up.</b> The conversation should read <code>CLOSED</code>, and the post-call operator results should reach the webhook within seconds.</li>
      </ul>
      <div class="reflinks"><a href="https://www.twilio.com/docs/conversations/orchestrator/concepts/profiles">How profiles resolve</a><a href="https://www.twilio.com/docs/voice/voice-insights/conversation-relay-summary">ConversationRelay call summary</a></div>
      <p class="gotcha"><b>A missing profileId is not always an error.</b> Resolution runs asynchronously and best effort, so it can appear a moment after the participant does. It stays null for good only if resolution failed or the participant is not a customer.</p>
    </div>

  </div>
