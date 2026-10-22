  <div class="sec-head" id="config"><span class="num"><b>04</b></span><h2>How the Twilio objects are configured, and why</h2></div>

  <p>For the demo, every object is created by one idempotent provisioning script whose specification sits at the top of the file as plain data, so the configuration can be read before any API code. Running it again finds each object by display name, creates what is missing and updates what has drifted.</p>

  <div class="wide">
    <table>
      <thead><tr><th>Object</th><th>Setting</th><th>Why</th></tr></thead>
      <tbody>
        <tr><td>Conversation configuration</td><td><code>GROUP_BY_PROFILE</code></td><td>A call and a text from the same phone share one conversation and one history.</td></tr>
        <tr><td>Conversation configuration</td><td>No voice capture rules</td><td>ConversationRelay already transcribes the call and routes it in through <code>conversationConfiguration</code>. A voice capture rule would start a second transcription stream and bill speech-to-text twice.</td></tr>
        <tr><td>Conversation configuration</td><td>Two SMS capture rules, both directions</td><td>The inbound rule captures the customer's text; the outbound rule threads the agent's reply into the same conversation.</td></tr>
        <tr><td>Conversation configuration</td><td>Voice <code>statusTimeouts</code> null</td><td>The conversation closes when the call's transcription stream ends, which fires the end-of-call rule. The application also closes it explicitly, because a call with no speech never ends a transcription stream.</td></tr>
        <tr><td>Memory store</td><td><code>HvacService</code> trait group</td><td>Memory rejects traits that are not declared in the store's schema, so the group exists before the application writes to it.</td></tr>
        <tr><td>Intelligence rule 1</td><td><code>COMMUNICATION</code>, Sentiment</td><td>Live sentiment for the console, one result per utterance.</td></tr>
        <tr><td>Intelligence rule 2</td><td><code>CONVERSATION_END</code>, Summary, Sentiment, Lead Qualification, Memory context on</td><td>Post-call results with the customer profile available to the operators.</td></tr>
        <tr><td>Lead Qualification operator</td><td>Custom, JSON output, enums use <code>UNKNOWN</code></td><td>Structured output the application can write straight to traits. The operator schema does not accept nullable enums, so absence is an explicit value.</td></tr>
        <tr><td>Phone number</td><td>Voice URL to <code>/twiml</code>, kept in an existing 10DLC Messaging Service</td><td>Voice reaches the application directly; SMS reaches it through the Orchestrator, so the Messaging Service needs no inbound webhook.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="sec-head" id="choices"><span class="num"><b>05</b></span><h2>Design choices worth teaching</h2></div>

  <p><b>The application never handles audio.</b> ConversationRelay owns speech-to-text, text-to-speech, endpointing and barge-in. The application's contract with it is text over a WebSocket, and every speech setting is a TwiML attribute. That is why the demo can expose a TwiML builder: changing the voice, the transcription model or the interruption sensitivity is a configuration change, not a code change.</p>

  <p><b>Stream the reply, and measure the first token.</b> The caller's wait is the time from the end of their speech to the start of the agent's. Streaming tokens into ConversationRelay lets speech start on the first sentence. The application measures time to first token on its side; Voice Insights adds the speech-to-text, text-to-speech and network legs from Twilio's side, and every call in the console links to it.</p>

  <p><b>Facts from the agent, judgement from Intelligence.</b> The agent's tool saves what the caller stated: name, confirmed address, reason, service type. Purchase interest is a judgement about the whole call, so it comes from a language operator that reads the full transcript after the conversation closes. The two writes go to the same profile from different sources, and the console shows both.</p>

  <p><b>Close the conversation on hang-up.</b> End-of-call Intelligence runs when the conversation closes, not when the call ends. With voice timeouts left null the conversation closes when the transcription stream ends; the application also closes it as soon as the WebSocket drops, because voice timers run on transcription events and a silent call would otherwise stay open.</p>

  <p><b>Rewrite history on barge-in.</b> When the caller interrupts, the chat history is truncated to what they actually heard. Skipping this step is the most common cause of a voice agent answering a question nobody asked.</p>

  <p><b>Spell numbers in code, not only in the prompt.</b> The prompt asks for ZIP codes digit by digit, and a stream filter enforces it, because a model instruction alone is not reliable and text-to-speech engines read five-digit numbers as quantities.</p>
