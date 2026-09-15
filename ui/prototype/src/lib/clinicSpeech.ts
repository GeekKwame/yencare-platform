const DIGITS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** Oral verification line for desk staff, e.g. YC-4821 → "Y C four eight two one". */
export function speakableReference(code: string): string {
  return code
    .toUpperCase()
    .split('')
    .map((ch) => {
      if (ch === '-') return '';
      if (/\d/.test(ch)) return DIGITS[Number(ch)];
      if (/[A-Z]/.test(ch)) return ch;
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export function playCallChime() {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const beep = (freq: number, start: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 0.18);
  };

  const t = ctx.currentTime;
  beep(784, t);
  beep(1047, t + 0.2);
}

export function speakText(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.92;
  utter.pitch = 1;
  utter.lang = 'en-GB';
  window.speechSynthesis.speak(utter);
}

export function announcePatientCall(name: string, room: string, token?: string) {
  playCallChime();
  const line = token
    ? `${name}. Token ${token}. Please proceed to ${room}.`
    : `${name}. Please proceed to ${room}.`;
  window.setTimeout(() => speakText(line), 420);
}
