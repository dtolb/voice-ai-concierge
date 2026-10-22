#!/bin/sh
# Assembles ../inbound-voice-ai-concierge.html from the numbered fragments.
set -e
cd "$(dirname "$0")"
python3 gen_flows.py
cat 01-head.frag favicon.frag 03-style.frag 03b-headclose.frag 04-intro.frag 05-topo.frag 06-nodes.frag \
    07-flows.frag 075-setup.frag 08-config.frag 09-close.frag 99-script.frag > ../inbound-voice-ai-concierge.html
printf '</body>\n</html>\n' >> ../inbound-voice-ai-concierge.html
wc -c ../inbound-voice-ai-concierge.html
