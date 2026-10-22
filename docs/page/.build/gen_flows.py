"""Generates the two call-flow ladder fragments for the architecture page."""

import pathlib

LANE = {"caller": 10, "relay": 30, "app": 50, "llm": 70, "conv": 90}
ACC = {"caller": "#2E7D5B", "relay": "#2E6FA3", "app": "#C42B72", "llm": "#C42B72", "conv": "#2E6FA3"}

LANES_HTML = """    <div class="lanes">
      <div class="lane"><span class="dot far"></span><span>Caller</span></div>
      <div class="lane"><span class="dot plat"></span><span>ConversationRelay</span></div>
      <div class="lane"><span class="dot app"></span><span>Agent server</span></div>
      <div class="lane"><span class="dot ai"></span><span>OpenAI</span></div>
      <div class="lane"><span class="dot ci"></span><span>Orchestrator, Memory, Intelligence</span></div>
    </div>"""

RAILS = '      <div class="rails"><i style="left:10%"></i><i style="left:30%"></i><i style="left:50%"></i><i style="left:70%"></i><i style="left:90%"></i></div>'


def hop(flow: str, n: int, src: str, dst: str, title: str, what: str, why: str, both: bool = False) -> str:
    """Renders one ladder hop from lane `src` to lane `dst`."""
    a, b = LANE[src], LANE[dst]
    lo, hi = min(a, b), max(a, b)
    direction = "b" if both else ("r" if b > a else "l")
    hid = f"h-{flow}{n}"
    label = f"{flow.upper()}{n:02d}"
    return f"""      <div class="step" style="--acc:{ACC[src]}">
        <button class="row" style="--from:{lo}%;--to:{hi}%" data-dir="{direction}" aria-expanded="false" aria-controls="{hid}">
          <span class="head2"></span><span class="wlabel"><span class="hdr"><span class="n">{label}</span><span class="chev">&#9656;</span></span><span class="t">{title}</span></span>
        </button>
        <div class="detail" id="{hid}" hidden>
          <p class="what">{what}</p>
          <p class="why">{why}</p>
        </div>
      </div>"""


def block(flow: str, heading: str, caption: str, hops: list[str]) -> str:
    """Renders a titled ladder with bulk expand and collapse."""
    body = "\n".join(hops)
    return f"""  <div class="lblock">
    <h3>{heading}</h3>
    <p class="lcap">{caption}</p>
    <div class="bulk"><button data-bulk="open" data-flow="{flow}">Expand all</button><button data-bulk="close" data-flow="{flow}">Collapse</button></div>
{LANES_HTML}
    <div class="ladder" data-flow="{flow}">
{RAILS}
{body}
    </div>
  </div>"""


FLOW_A = [
    hop("a", 1, "caller", "relay", "Caller dials the number",
        "The call reaches the Twilio number, whose voice URL is the agent server's <code>/twiml</code> endpoint. Twilio posts the call's details there, signed with <code>X-Twilio-Signature</code>.",
        "The agent server validates the signature before it answers. A request without a valid signature gets a 403."),
    hop("a", 2, "app", "relay", "Server answers with &lt;ConversationRelay&gt;",
        "The SDK calls the application's inbound customizer, which creates a call record and returns the active TwiML preset: voice, speech-to-text provider and model, greeting, interruption settings and hints. The SDK adds the WebSocket URL, the <code>&lt;Connect action&gt;</code> URL and <code>conversationConfiguration</code>, and returns the TwiML.",
        "<b>conversationConfiguration is what puts the call into the Orchestrator.</b> No voice capture rule is needed, and adding one would start a second transcription."),
    hop("a", 3, "relay", "conv", "Conversation and participants created",
        "ConversationRelay creates or resolves a conversation under the configuration at call connect, with two participants: the caller as <code>CUSTOMER</code> and the Twilio number as <code>AGENT</code>. Memory then resolves the customer's phone number against the <code>phone</code> trait, finding an existing profile or creating one.",
        "<b>Profile resolution is asynchronous and best effort.</b> The participant exists before its <code>profileId</code> does, and a failed lookup leaves it null without failing the call. Only a participant explicitly typed <code>CUSTOMER</code> gets a new profile created, which ConversationRelay does for the caller."),
    hop("a", 4, "relay", "app", "WebSocket opens, greeting plays",
        "ConversationRelay opens the WebSocket and sends <code>setup</code> with the CallSid. It speaks the welcome greeting from the TwiML while the SDK polls the Orchestrator for the conversation and its profile in the background.",
        "The lookup overlaps the greeting, so the first turn does not wait for it."),
    hop("a", 5, "caller", "app", "Caller describes the problem",
        "ConversationRelay transcribes the utterance and sends a <code>prompt</code> message. The SDK fetches the caller's memory once for the call and hands the text, the memory and the session to the application's turn handler.",
        "Memory is fetched once per call rather than on every turn, which keeps a network round trip off the hot path."),
    hop("a", 6, "app", "llm", "Agent turn streams from OpenAI",
        "The application composes the active system prompt with the caller's profile and recent summaries, appends the utterance to the conversation's chat history, and runs the agent with streaming on.",
        "<b>Time to first token is the caller's wait.</b> The application records it on every turn and shows it in call history."),
    hop("a", 7, "app", "relay", "Tokens stream back to the caller",
        "Each token goes to ConversationRelay as a <code>text</code> message as soon as it arrives, after a filter that spells five-digit numbers digit by digit so a ZIP code is not read as a quantity. ConversationRelay starts speaking before the reply is complete.",
        "The filter holds back a trailing run of digits until it is complete, because a ZIP code can arrive split across tokens."),
    hop("a", 8, "relay", "conv", "Every utterance is recorded and scored",
        "Each caller turn and each agent reply becomes a communication in the conversation. Intelligence rule one runs Sentiment on each and posts the result to <code>/webhooks/intelligence</code>, where the application matches it to the call by CallSid and streams it to the live view.",
        "On a measured demo call, 23 communications alternated caller and agent, one per whole turn, not one per streamed token. Results land one to four seconds after the turn."),
    hop("a", 9, "app", "conv", "Agent saves the confirmed address",
        "The prompt makes the agent ask for the service address, read it back and wait for a yes. On confirmation the model calls <code>save_customer_details</code>, and the application patches the profile's <code>Contact</code> and <code>HvacService</code> traits.",
        "The tool takes an <code>addressConfirmed</code> flag. A model told to save only after confirmation still needs a field that records whether it did."),
    hop("a", 10, "caller", "app", "Caller barges in",
        "If the caller talks over the agent, ConversationRelay stops speaking and sends <code>interrupt</code> with the text spoken so far. The SDK cancels the stream, and the application truncates the stored reply to that text.",
        "Without the truncation, the model believes the caller heard the whole reply and answers questions the caller never asked."),
    hop("a", 11, "app", "relay", "Goodbye, then hang up",
        "When the caller is done, the model says goodbye and calls <code>end_call</code> in the same turn. After the goodbye has streamed, the application waits for its estimated speaking time plus a second and a half, then ends the call through the Calls REST API.",
        "<b>A timer, not an event.</b> ConversationRelay can report when the agent stops speaking, but the SDK version used does not pass those events to the application."),
    hop("a", 12, "app", "conv", "Conversation closed",
        "With the voice channel's <code>statusTimeouts</code> left null, the conversation closes when ConversationRelay's transcription stream ends. The application also sets it to <code>CLOSED</code> through the API as soon as the WebSocket drops.",
        "<b>Closing is what fires the end-of-call rule.</b> Voice timers run on transcription events, not call events, so a call in which nobody speaks stays <code>ACTIVE</code> indefinitely. The explicit close covers that case."),
    hop("a", 13, "conv", "app", "Post-call results arrive",
        "Rule two runs Summary, Sentiment and HVAC Lead Qualification and posts all three to the same webhook. The application writes the lead result's purchase interest and rationale to the profile, and fills in address and reason only if the agent never saved them.",
        "Purchase interest is judged from the whole transcript by an operator, not by the agent mid-call."),
]

FLOW_B = [
    hop("b", 1, "caller", "conv", "Caller texts the number",
        "Two capture rules on the configuration, from any address to the number and from the number to any address, put the inbound text into the customer's conversation. Memory resolves the same profile a call from that phone would.",
        "The outbound rule is what threads the agent's reply into the same conversation."),
    hop("b", 2, "conv", "app", "Orchestrator notifies the server",
        "The configuration's status callback posts the new communication to <code>/webhook</code>. The SDK's SMS channel fetches memory for the message and hands it to the application.",
        "SMS fetches memory on every message, because a text thread has no call boundary to cache against."),
    hop("b", 3, "app", "llm", "Agent turn runs to completion",
        "The same prompt and tools as voice, with a note that the channel is text, so replies can run longer. The reply is generated whole rather than streamed.",
        "The end-call tool is not offered on SMS."),
    hop("b", 4, "app", "caller", "Reply is sent",
        "The application returns the reply text and the SDK sends it as an SMS from the number. The outbound capture rule records it in the conversation.",
        "The conversation closes on the configuration's five-minute timeout, which fires the same end-of-call rule as a phone call."),
]


def main() -> None:
    """Writes 07-flows.frag next to this script."""
    intro = """  <div class="sec-head" id="flows"><span class="num"><b>02</b></span><h2>Call flows</h2></div>

  <p>Two flows cover the demo. The first is the scenario under test, an inbound call from a customer who wants a furnace replaced. The second is a text to the same number, which lands in the same conversation and profile. Each hop names who sends what to whom.</p>

  <div class="legend">
    <div><i style="background:#2E7D5B"></i>Caller</div>
    <div><i style="background:#2E6FA3"></i>Twilio</div>
    <div><i style="background:#C42B72"></i>Your application and its model</div>
  </div>

  <p class="hint">Select any hop to expand it. Hops are numbered per flow.</p>

  <div class="wide">
"""
    a = block("a", "Flow A. An inbound call, from greeting to post-call intelligence",
              "The scenario under test: the caller wants a replacement, the agent needs the service address, confirms it, saves the lead and hangs up.", FLOW_A)
    b = block("b", "Flow B. A text message to the same number",
              "Same agent, same profile, same conversation history. The reply is returned whole instead of streamed.", FLOW_B)
    pathlib.Path(__file__).with_name("07-flows.frag").write_text(intro + a + "\n\n" + b + "\n  </div>\n")


if __name__ == "__main__":
    main()
