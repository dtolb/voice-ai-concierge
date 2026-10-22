const DIGIT_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const ZIP = /(?<![\d,.$])(\d{5})(?:-(\d{4}))?(?![\d,%]|\.\d)/g;
const HOLD_BACK = /[\d-]+$/;

/** Rewrites 5-digit runs (and ZIP+4) as spoken single digits: "78731" -> "seven eight seven three one". */
export function speakZipCodes(text: string): string {
  return text.replace(ZIP, (_match, zip: string, plus4: string | undefined) => {
    const spell = (digits: string) => [...digits].map(d => DIGIT_WORDS[Number(d)]).join(' ');
    return plus4 ? `${spell(zip)} dash ${spell(plus4)}` : spell(zip);
  });
}

/** Applies speakZipCodes to a token stream, holding back a trailing digit run until it is complete. */
export async function* speakZipCodesStream(tokens: AsyncIterable<string>): AsyncGenerator<string> {
  let pending = '';
  for await (const token of tokens) {
    pending += token;
    const tail = HOLD_BACK.exec(pending)?.[0] ?? '';
    const ready = pending.slice(0, pending.length - tail.length);
    pending = tail;
    if (ready) yield speakZipCodes(ready);
  }
  if (pending) yield speakZipCodes(pending);
}

/** Estimates how long TTS takes to speak `text`, in milliseconds. */
export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.round((words / 2.6) * 1000);
}
