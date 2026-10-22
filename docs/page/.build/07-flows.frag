  <div class="sec-head" id="flows"><span class="num"><b>02</b></span><h2>Call flows</h2></div>

  <p>Two flows cover the demo. The first is the scenario under test, an inbound call from a customer who wants a furnace replaced. The second is a text to the same number, which lands in the same conversation and profile. Each hop names who sends what to whom.</p>

  <div class="legend">
    <div><i style="background:#2E7D5B"></i>Caller</div>
    <div><i style="background:#2E6FA3"></i>Twilio</div>
    <div><i style="background:#C42B72"></i>Your application and its model</div>
  </div>

  <p class="hint">Select any hop to expand it. Hops are numbered per flow.</p>

  <div class="wide">
  <div class="lblock">
    <h3>Flow A. An inbound call, from greeting to post-call intelligence</h3>
    <p class="lcap">The scenario under test: the caller wants a replacement, the agent needs the service address, confirms it, saves the lead and hangs up.</p>
    <div class="bulk"><button data-bulk="open" data-flow="a">Expand all</button><button data-bulk="close" data-flow="a">Collapse</button></div>
    <div class="lanes">
      <div class="lane"><span class="dot far"></span><span>Caller</span></div>
      <div class="lane"><span class="dot plat"></span><span>ConversationRelay</span></div>
      <div class="lane"><span class="dot app"></span><span>Agent server</span></div>
      <div class="lane"><span class="dot ai"></span><span>OpenAI</span></div>
      <div class="lane"><span class="dot ci"></span><span>Orchestrator, Memory, Intelligence</span></div>
    </div>
    <div class="ladder" data-flow="a">
      <div class="rails"><i style="left:10%"></i><i style="left:30%"></i><i style="left:50%"></i><i style="left:70%"></i><i style="left:90%"></i></div>
      <div class="step" style="--acc:#2E7D5B">
        <button class="row" style="--from:10%;--to:30%" data-dir="r" aria-expanded="false" aria-controls="h-a1">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A01</span><span class="chev">&#9656;</span></span><span class="t">Caller dials the number</span></span>
        </button>
        <div class="detail" id="h-a1" hidden>
          <p class="what">The call reaches the Twilio number, whose voice URL is the agent server's <code>/twiml</code> endpoint. Twilio posts the call's details there, signed with <code>X-Twilio-Signature</code>.</p>
          <p class="why">The agent server validates the signature before it answers. A request without a valid signature gets a 403.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:30%;--to:50%" data-dir="l" aria-expanded="false" aria-controls="h-a2">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A02</span><span class="chev">&#9656;</span></span><span class="t">Server answers with &lt;ConversationRelay&gt;</span></span>
        </button>
        <div class="detail" id="h-a2" hidden>
          <p class="what">The SDK calls the application's inbound customizer, which creates a call record and returns the active TwiML preset: voice, speech-to-text provider and model, greeting, interruption settings and hints. The SDK adds the WebSocket URL, the <code>&lt;Connect action&gt;</code> URL and <code>conversationConfiguration</code>, and returns the TwiML.</p>
          <p class="why"><b>conversationConfiguration is what puts the call into the Orchestrator.</b> No voice capture rule is needed, and adding one would start a second transcription.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E6FA3">
        <button class="row" style="--from:30%;--to:90%" data-dir="r" aria-expanded="false" aria-controls="h-a3">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A03</span><span class="chev">&#9656;</span></span><span class="t">Conversation and participants created</span></span>
        </button>
        <div class="detail" id="h-a3" hidden>
          <p class="what">ConversationRelay creates or resolves a conversation under the configuration at call connect, with two participants: the caller as <code>CUSTOMER</code> and the Twilio number as <code>AGENT</code>. Memory then resolves the customer's phone number against the <code>phone</code> trait, finding an existing profile or creating one.</p>
          <p class="why"><b>Profile resolution is asynchronous and best effort.</b> The participant exists before its <code>profileId</code> does, and a failed lookup leaves it null without failing the call. Only a participant explicitly typed <code>CUSTOMER</code> gets a new profile created, which ConversationRelay does for the caller.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E6FA3">
        <button class="row" style="--from:30%;--to:50%" data-dir="r" aria-expanded="false" aria-controls="h-a4">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A04</span><span class="chev">&#9656;</span></span><span class="t">WebSocket opens, greeting plays</span></span>
        </button>
        <div class="detail" id="h-a4" hidden>
          <p class="what">ConversationRelay opens the WebSocket and sends <code>setup</code> with the CallSid. It speaks the welcome greeting from the TwiML while the SDK polls the Orchestrator for the conversation and its profile in the background.</p>
          <p class="why">The lookup overlaps the greeting, so the first turn does not wait for it.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E7D5B">
        <button class="row" style="--from:10%;--to:50%" data-dir="r" aria-expanded="false" aria-controls="h-a5">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A05</span><span class="chev">&#9656;</span></span><span class="t">Caller describes the problem</span></span>
        </button>
        <div class="detail" id="h-a5" hidden>
          <p class="what">ConversationRelay transcribes the utterance and sends a <code>prompt</code> message. The SDK fetches the caller's memory once for the call and hands the text, the memory and the session to the application's turn handler.</p>
          <p class="why">Memory is fetched once per call rather than on every turn, which keeps a network round trip off the hot path.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:50%;--to:70%" data-dir="r" aria-expanded="false" aria-controls="h-a6">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A06</span><span class="chev">&#9656;</span></span><span class="t">Agent turn streams from OpenAI</span></span>
        </button>
        <div class="detail" id="h-a6" hidden>
          <p class="what">The application composes the active system prompt with the caller's profile and recent summaries, appends the utterance to the conversation's chat history, and runs the agent with streaming on.</p>
          <p class="why"><b>Time to first token is the caller's wait.</b> The application records it on every turn and shows it in call history.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:30%;--to:50%" data-dir="l" aria-expanded="false" aria-controls="h-a7">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A07</span><span class="chev">&#9656;</span></span><span class="t">Tokens stream back to the caller</span></span>
        </button>
        <div class="detail" id="h-a7" hidden>
          <p class="what">Each token goes to ConversationRelay as a <code>text</code> message as soon as it arrives, after a filter that spells five-digit numbers digit by digit so a ZIP code is not read as a quantity. ConversationRelay starts speaking before the reply is complete.</p>
          <p class="why">The filter holds back a trailing run of digits until it is complete, because a ZIP code can arrive split across tokens.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E6FA3">
        <button class="row" style="--from:30%;--to:90%" data-dir="r" aria-expanded="false" aria-controls="h-a8">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A08</span><span class="chev">&#9656;</span></span><span class="t">Every utterance is recorded and scored</span></span>
        </button>
        <div class="detail" id="h-a8" hidden>
          <p class="what">Each caller turn and each agent reply becomes a communication in the conversation. Intelligence rule one runs Sentiment on each and posts the result to <code>/webhooks/intelligence</code>, where the application matches it to the call by CallSid and streams it to the live view.</p>
          <p class="why">On a measured demo call, 23 communications alternated caller and agent, one per whole turn, not one per streamed token. Results land one to four seconds after the turn.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:50%;--to:90%" data-dir="r" aria-expanded="false" aria-controls="h-a9">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A09</span><span class="chev">&#9656;</span></span><span class="t">Agent saves the confirmed address</span></span>
        </button>
        <div class="detail" id="h-a9" hidden>
          <p class="what">The prompt makes the agent ask for the service address, read it back and wait for a yes. On confirmation the model calls <code>save_customer_details</code>, and the application patches the profile's <code>Contact</code> and <code>HvacService</code> traits.</p>
          <p class="why">The tool takes an <code>addressConfirmed</code> flag. A model told to save only after confirmation still needs a field that records whether it did.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E7D5B">
        <button class="row" style="--from:10%;--to:50%" data-dir="r" aria-expanded="false" aria-controls="h-a10">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A10</span><span class="chev">&#9656;</span></span><span class="t">Caller barges in</span></span>
        </button>
        <div class="detail" id="h-a10" hidden>
          <p class="what">If the caller talks over the agent, ConversationRelay stops speaking and sends <code>interrupt</code> with the text spoken so far. The SDK cancels the stream, and the application truncates the stored reply to that text.</p>
          <p class="why">Without the truncation, the model believes the caller heard the whole reply and answers questions the caller never asked.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:30%;--to:50%" data-dir="l" aria-expanded="false" aria-controls="h-a11">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A11</span><span class="chev">&#9656;</span></span><span class="t">Goodbye, then hang up</span></span>
        </button>
        <div class="detail" id="h-a11" hidden>
          <p class="what">When the caller is done, the model says goodbye and calls <code>end_call</code> in the same turn. After the goodbye has streamed, the application waits for its estimated speaking time plus a second and a half, then ends the call through the Calls REST API.</p>
          <p class="why"><b>A timer, not an event.</b> ConversationRelay can report when the agent stops speaking, but the SDK version used does not pass those events to the application.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:50%;--to:90%" data-dir="r" aria-expanded="false" aria-controls="h-a12">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A12</span><span class="chev">&#9656;</span></span><span class="t">Conversation closed</span></span>
        </button>
        <div class="detail" id="h-a12" hidden>
          <p class="what">With the voice channel's <code>statusTimeouts</code> left null, the conversation closes when ConversationRelay's transcription stream ends. The application also sets it to <code>CLOSED</code> through the API as soon as the WebSocket drops.</p>
          <p class="why"><b>Closing is what fires the end-of-call rule.</b> Voice timers run on transcription events, not call events, so a call in which nobody speaks stays <code>ACTIVE</code> indefinitely. The explicit close covers that case.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E6FA3">
        <button class="row" style="--from:50%;--to:90%" data-dir="l" aria-expanded="false" aria-controls="h-a13">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">A13</span><span class="chev">&#9656;</span></span><span class="t">Post-call results arrive</span></span>
        </button>
        <div class="detail" id="h-a13" hidden>
          <p class="what">Rule two runs Summary, Sentiment and HVAC Lead Qualification and posts all three to the same webhook. The application writes the lead result's purchase interest and rationale to the profile, and fills in address and reason only if the agent never saved them.</p>
          <p class="why">Purchase interest is judged from the whole transcript by an operator, not by the agent mid-call.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="lblock">
    <h3>Flow B. A text message to the same number</h3>
    <p class="lcap">Same agent, same profile, same conversation history. The reply is returned whole instead of streamed.</p>
    <div class="bulk"><button data-bulk="open" data-flow="b">Expand all</button><button data-bulk="close" data-flow="b">Collapse</button></div>
    <div class="lanes">
      <div class="lane"><span class="dot far"></span><span>Caller</span></div>
      <div class="lane"><span class="dot plat"></span><span>ConversationRelay</span></div>
      <div class="lane"><span class="dot app"></span><span>Agent server</span></div>
      <div class="lane"><span class="dot ai"></span><span>OpenAI</span></div>
      <div class="lane"><span class="dot ci"></span><span>Orchestrator, Memory, Intelligence</span></div>
    </div>
    <div class="ladder" data-flow="b">
      <div class="rails"><i style="left:10%"></i><i style="left:30%"></i><i style="left:50%"></i><i style="left:70%"></i><i style="left:90%"></i></div>
      <div class="step" style="--acc:#2E7D5B">
        <button class="row" style="--from:10%;--to:90%" data-dir="r" aria-expanded="false" aria-controls="h-b1">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">B01</span><span class="chev">&#9656;</span></span><span class="t">Caller texts the number</span></span>
        </button>
        <div class="detail" id="h-b1" hidden>
          <p class="what">Two capture rules on the configuration, from any address to the number and from the number to any address, put the inbound text into the customer's conversation. Memory resolves the same profile a call from that phone would.</p>
          <p class="why">The outbound rule is what threads the agent's reply into the same conversation.</p>
        </div>
      </div>
      <div class="step" style="--acc:#2E6FA3">
        <button class="row" style="--from:50%;--to:90%" data-dir="l" aria-expanded="false" aria-controls="h-b2">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">B02</span><span class="chev">&#9656;</span></span><span class="t">Orchestrator notifies the server</span></span>
        </button>
        <div class="detail" id="h-b2" hidden>
          <p class="what">The configuration's status callback posts the new communication to <code>/webhook</code>. The SDK's SMS channel fetches memory for the message and hands it to the application.</p>
          <p class="why">SMS fetches memory on every message, because a text thread has no call boundary to cache against.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:50%;--to:70%" data-dir="r" aria-expanded="false" aria-controls="h-b3">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">B03</span><span class="chev">&#9656;</span></span><span class="t">Agent turn runs to completion</span></span>
        </button>
        <div class="detail" id="h-b3" hidden>
          <p class="what">The same prompt and tools as voice, with a note that the channel is text, so replies can run longer. The reply is generated whole rather than streamed.</p>
          <p class="why">The end-call tool is not offered on SMS.</p>
        </div>
      </div>
      <div class="step" style="--acc:#C42B72">
        <button class="row" style="--from:10%;--to:50%" data-dir="l" aria-expanded="false" aria-controls="h-b4">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">B04</span><span class="chev">&#9656;</span></span><span class="t">Reply is sent</span></span>
        </button>
        <div class="detail" id="h-b4" hidden>
          <p class="what">The application returns the reply text and the SDK sends it as an SMS from the number. The outbound capture rule records it in the conversation.</p>
          <p class="why">The conversation closes on the configuration's five-minute timeout, which fires the same end-of-call rule as a phone call.</p>
        </div>
      </div>
    </div>
  </div>
  </div>
