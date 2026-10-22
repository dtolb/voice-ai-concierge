  <div class="sec-head" id="open"><span class="num"><b>06</b></span><h2>Open items</h2></div>

  <p>Each of these was observed in the demo or read from documentation, but not confirmed as platform behaviour.</p>

  <ul>
    <li><strong>Hang-up timing is an estimate.</strong> The application waits for roughly 2.6 words per second of goodbye plus 1.5 seconds. A slower voice or a longer goodbye can be cut off, and a fast one leaves a pause. ConversationRelay's <code>speaker-events</code> subscription would give an exact end-of-speech signal; using it needs a version of the Agent Connect SDK that forwards those messages.</li>
    <li><strong>How quickly a closed conversation fires its end-of-call rule.</strong> In a related build, results arrived about two seconds after an explicit close on one call and about four and a half minutes later on another, where the conversation stayed active after the hang-up. The demo closes explicitly to avoid the second case.</li>
    <li><strong>How many communications a voice turn produces.</strong> The lifecycle documentation warns that a <code>COMMUNICATION</code> trigger fires per text-to-speech fragment. On a measured demo call with streamed replies, each agent turn was one communication. Whether that holds for every reply shape, such as a reply split by an interruption, is not confirmed.</li>
    <li><strong>Reasoning effort on the model.</strong> The demo runs the model at low reasoning effort. With reasoning off, the agent skipped the address question and saved details before the caller confirmed them. Whether a faster setting holds up with a stricter prompt is untested.</li>
    <li><strong>Profile resolution on the first utterance.</strong> The documentation states that resolution is asynchronous and best effort, so on a first-time caller the profile can be missing for the opening seconds of the call. The agent's save tool reports that rather than failing silently, but the window has not been measured.</li>
    <li><strong>Which Console path holds the addendum.</strong> The ConversationRelay onboarding guide gives <b>Voice &gt; Settings &gt; Privacy &amp; Security</b> for the current Console and <b>Voice &gt; Settings &gt; General</b> for the legacy one. Console navigation moves; search for the addendum by name if neither path matches.</li>
  </ul>

  <div class="callout">
    <p class="ct">Deliberately absent</p>
    <p>No pricing appears on this page, and no account identifiers, phone numbers or customer names. The business in the scenario is invented. Twilio list prices are negotiated per account and they move, so the Twilio pricing pages carry the current figures.</p>
  </div>

  <footer>
    <p>Compiled 22 October 2026.</p>
    <p>Sourced from Twilio public documentation and from a working demo build. Product behaviour described here was either read from documentation or observed in that build, and the open items above say which.</p>
    <p>Anything that could not be confirmed is recorded as an open item rather than presented as fact.</p>
  </footer>
</div>
