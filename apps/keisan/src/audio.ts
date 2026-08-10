// 効果音。外部ファイルを使わず Web Audio で生成する
let ctx: AudioContext | null = null;
let enabled = true;

export const isSoundOn = (): boolean => enabled;
export const setSoundOn = (v: boolean): void => {
  enabled = v;
};

function tone(
  freqs: number[],
  dur = 0.09,
  type: OscillatorType = "sine",
): void {
  if (!enabled) {
    return;
  }
  try {
    const ac = ctx ?? new AudioContext();
    ctx = ac;
    if (ac.state === "suspended") {
      void ac.resume();
    }
    freqs.forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = f;
      const t = ac.currentTime + i * dur * 0.85;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    });
  } catch {
    // 音が出せない環境では無音で続行する
  }
}

export const sndOk = (): void => tone([880, 1318]);
export const sndNg = (): void => tone([196], 0.16, "square");
export const sndGoal = (): void => tone([523, 659, 784, 1046], 0.13);
export const sndTick = (): void => tone([660], 0.07, "triangle");
export const sndStart = (): void => tone([784, 1046], 0.12);
