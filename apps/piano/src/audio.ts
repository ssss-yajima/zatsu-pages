// Web Audio で生成するピアノ風の音。外部音源ファイルは使わない
let ctx: AudioContext | null = null;
let enabled = true;

export const isSoundOn = (): boolean => enabled;
export const setSoundOn = (v: boolean): void => {
  enabled = v;
};

function ac(): AudioContext | null {
  try {
    const c = ctx ?? new AudioContext();
    ctx = c;
    if (c.state === "suspended") {
      void c.resume();
    }
    return c;
  } catch {
    return null;
  }
}

/** ピアノ風の減衰音を 1 音鳴らす */
export function playFreq(freq: number, dur = 1.1, when = 0): void {
  if (!enabled) {
    return;
  }
  const c = ac();
  if (!c) {
    return;
  }
  const t = c.currentTime + when;
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, t);
  master.gain.exponentialRampToValueAtTime(0.5, t + 0.008);
  master.gain.exponentialRampToValueAtTime(0.18, t + 0.25);
  master.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  master.connect(c.destination);
  // 基音 + 倍音で少しピアノらしくする
  const partials: [number, number, OscillatorType][] = [
    [1, 0.6, "triangle"],
    [2, 0.25, "sine"],
    [3, 0.1, "sine"],
    [4, 0.05, "sine"],
  ];
  for (const [mul, vol, type] of partials) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq * mul;
    g.gain.value = vol;
    o.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}

/** 短い効果音 */
function blip(freqs: number[], dur: number, type: OscillatorType): void {
  if (!enabled) {
    return;
  }
  const c = ac();
  if (!c) {
    return;
  }
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    const t = c.currentTime + i * dur * 0.85;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  });
}

export const sndOk = (): void => blip([1046, 1568], 0.08, "sine");
export const sndNg = (): void => blip([180], 0.15, "square");
export const sndDone = (): void => blip([523, 659, 784, 1046], 0.12, "sine");
