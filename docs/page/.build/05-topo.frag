  <div class="sec-head" id="architecture"><span class="num"><b>01</b></span><h2>System architecture</h2></div>

  <p>Four groups do the work. The caller is on an ordinary phone. Twilio carries the call and owns three Conversations services: the Orchestrator, which records every utterance into one conversation per customer; Memory, which holds the customer profile; and Intelligence, which runs language operators over the conversation. The application in the middle runs the agent loop on the Twilio Agent Connect SDK, and calls OpenAI for the model. Audio never reaches the application. ConversationRelay converts speech to text and text to speech, and the application only ever exchanges text with it over a WebSocket.</p>

  <div class="wide">
    <div class="topo">
      <svg viewBox="0 0 1200 470" role="img" aria-label="Topology of the caller, Twilio voice and Conversations services, the application, and OpenAI">
        <defs>
          <marker id="ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#A8B7C0"></path>
          </marker>
        </defs>

        <text class="glabel" x="14" y="46">CALLER</text>
        <text class="glabel" x="232" y="46">TWILIO</text>
        <text class="glabel" x="640" y="46">YOUR APPLICATION</text>
        <text class="glabel" x="996" y="46">MODEL PROVIDER</text>
        <rect class="gbox" x="14" y="52" width="186" height="140"></rect>
        <rect class="gbox" x="232" y="52" width="376" height="400"></rect>
        <rect class="gbox" x="640" y="52" width="324" height="400"></rect>
        <rect class="gbox" x="996" y="52" width="190" height="140"></rect>

        <path class="edge" d="M184,122 L250,122" marker-start="url(#ar)" marker-end="url(#ar)"></path>
        <text class="elabel" x="196" y="113">PSTN</text>

        <path class="edge" d="M418,104 L656,104" marker-end="url(#ar)"></path>
        <text class="elabel" x="440" y="96">WEBHOOK /twiml</text>
        <path class="edge" d="M418,140 L656,140" marker-start="url(#ar)" marker-end="url(#ar)"></path>
        <text class="elabel" x="440" y="158">WEBSOCKET: PROMPTS IN, TOKENS OUT</text>

        <path class="edge" d="M334,149 L334,232" marker-end="url(#ar)"></path>
        <text class="elabel" x="342" y="196">TRANSCRIPT</text>

        <path class="edge" d="M334,286 L334,312" marker-end="url(#ar)"></path>
        <text class="elabel" x="342" y="303">PROFILE</text>
        <path class="edge" d="M250,259 L238,259 L238,407 L250,407" marker-end="url(#ar)"></path>
        <text class="elabel" x="244" y="380" transform="rotate(-90 244 380)">RULES FIRE</text>

        <path class="edge" d="M418,394 L656,394" marker-end="url(#ar)"></path>
        <text class="elabel" x="440" y="386">WEBHOOK /webhooks/intelligence</text>
        <path class="edge dash" d="M656,276 L540,276 L540,339 L418,339" marker-end="url(#ar)"></path>
        <path class="edge dash" d="M540,276 L540,259 L418,259" marker-end="url(#ar)"></path>
        <text class="elabel" x="440" y="251">CLOSE CONVERSATION</text>
        <text class="elabel" x="440" y="331">PATCH TRAITS</text>

        <path class="edge" d="M800,149 L800,222" marker-end="url(#ar)"></path>
        <path class="edge" d="M948,122 L1012,122" marker-start="url(#ar)" marker-end="url(#ar)"></path>
        <text class="elabel" x="954" y="113">STREAM</text>

        <path class="edge dash" d="M800,286 L800,352" marker-end="url(#ar)"></path>
        <text class="elabel" x="808" y="324">SERVER-SENT EVENTS</text>

        <g class="node" id="n-caller" role="button" tabindex="0" aria-expanded="false" aria-controls="d-caller">
          <rect x="30" y="95" width="154" height="54" stroke="#2E7D5B"></rect>
          <text class="nlabel" x="44" y="118">Caller</text>
          <text class="nsub" x="44" y="135">ANY PHONE</text>
        </g>
        <g class="node" id="n-relay" role="button" tabindex="0" aria-expanded="false" aria-controls="d-relay">
          <rect x="250" y="95" width="168" height="54" stroke="#2E6FA3"></rect>
          <text class="nlabel" x="264" y="118">ConversationRelay</text>
          <text class="nsub" x="264" y="135">STT AND TTS</text>
        </g>
        <g class="node" id="n-orch" role="button" tabindex="0" aria-expanded="false" aria-controls="d-orch">
          <rect x="250" y="232" width="168" height="54" stroke="#2E6FA3"></rect>
          <text class="nlabel" x="264" y="255">Conv. Orchestrator</text>
          <text class="nsub" x="264" y="272">ONE CONVERSATION</text>
        </g>
        <g class="node" id="n-memory" role="button" tabindex="0" aria-expanded="false" aria-controls="d-memory">
          <rect x="250" y="312" width="168" height="54" stroke="#2E7D5B"></rect>
          <text class="nlabel" x="264" y="335">Conv. Memory</text>
          <text class="nsub" x="264" y="352">CUSTOMER PROFILE</text>
        </g>
        <g class="node" id="n-intel" role="button" tabindex="0" aria-expanded="false" aria-controls="d-intel">
          <rect x="250" y="380" width="168" height="54" stroke="#2E6FA3"></rect>
          <text class="nlabel" x="264" y="403">Conv. Intelligence</text>
          <text class="nsub" x="264" y="420">LANGUAGE OPERATORS</text>
        </g>
        <g class="node" id="n-tac" role="button" tabindex="0" aria-expanded="false" aria-controls="d-tac">
          <rect x="656" y="95" width="292" height="54" stroke="#C42B72"></rect>
          <text class="nlabel" x="670" y="118">Agent server on Twilio Agent Connect</text>
          <text class="nsub" x="670" y="135">TWIML, WEBSOCKET, TURNS, TOOLS</text>
        </g>
        <g class="node" id="n-store" role="button" tabindex="0" aria-expanded="false" aria-controls="d-store">
          <rect x="656" y="232" width="292" height="54" stroke="#C42B72"></rect>
          <text class="nlabel" x="670" y="255">Call records, prompts, TwiML presets</text>
          <text class="nsub" x="670" y="272">ONE JSON FILE</text>
        </g>
        <g class="node" id="n-ui" role="button" tabindex="0" aria-expanded="false" aria-controls="d-ui">
          <rect x="656" y="352" width="292" height="54" stroke="#C42B72"></rect>
          <text class="nlabel" x="670" y="375">Web console</text>
          <text class="nsub" x="670" y="392">LIVE, HISTORY, PROMPT, TWIML</text>
        </g>
        <g class="node" id="n-llm" role="button" tabindex="0" aria-expanded="false" aria-controls="d-llm">
          <rect x="1012" y="95" width="158" height="54" stroke="#C42B72"></rect>
          <text class="nlabel" x="1026" y="118">OpenAI</text>
          <text class="nsub" x="1026" y="135">AGENTS SDK</text>
        </g>
      </svg>
    </div>
    <p class="hint">Select any box for what it does, why it is here, what it talks to, and its constraint.</p>
  </div>
