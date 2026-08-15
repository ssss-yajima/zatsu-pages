// 音符クイズのレベル定義と出題
import {
  type Accidental,
  type Clef,
  fromStep,
  type Pitch,
  pitch,
  step,
} from "./notes";

export interface Level {
  id: string;
  title: string;
  desc: string;
  clefs: Clef[];
  /** 出題範囲（両端含む）。clef ごと */
  range: Record<Clef, [Pitch, Pitch]>;
  /** ♯♭を混ぜる */
  accidentals: boolean;
}

const treble = (lo: Pitch, hi: Pitch): [Pitch, Pitch] => [lo, hi];

const RANGE_T_BASIC = treble(pitch("C", 4), pitch("G", 4));
const RANGE_T_STAFF = treble(pitch("C", 4), pitch("A", 5));
const RANGE_T_WIDE = treble(pitch("A", 3), pitch("C", 6));
const RANGE_B_BASIC = treble(pitch("F", 3), pitch("C", 4));
const RANGE_B_STAFF = treble(pitch("F", 2), pitch("C", 4));
const RANGE_B_WIDE = treble(pitch("C", 2), pitch("E", 4));

export const LEVELS: Level[] = [
  {
    id: "t1",
    title: "ト音記号 ド〜ソ",
    desc: "右手の基本ポジション。真ん中のドから5つ",
    clefs: ["treble"],
    range: { treble: RANGE_T_BASIC, bass: RANGE_B_BASIC },
    accidentals: false,
  },
  {
    id: "t2",
    title: "ト音記号 五線ぜんぶ",
    desc: "ドから上のラまで。線と間をぜんぶ読む",
    clefs: ["treble"],
    range: { treble: RANGE_T_STAFF, bass: RANGE_B_STAFF },
    accidentals: false,
  },
  {
    id: "b1",
    title: "ヘ音記号 ファ〜ド",
    desc: "左手の基本ポジション。真ん中のドから下へ5つ",
    clefs: ["bass"],
    range: { treble: RANGE_T_BASIC, bass: RANGE_B_BASIC },
    accidentals: false,
  },
  {
    id: "b2",
    title: "ヘ音記号 五線ぜんぶ",
    desc: "下のファから真ん中のドまで",
    clefs: ["bass"],
    range: { treble: RANGE_T_STAFF, bass: RANGE_B_STAFF },
    accidentals: false,
  },
  {
    id: "mix",
    title: "両方まぜて",
    desc: "ト音とヘ音がランダムに出る。記号を見て切り替える練習",
    clefs: ["treble", "bass"],
    range: { treble: RANGE_T_STAFF, bass: RANGE_B_STAFF },
    accidentals: false,
  },
  {
    id: "acc",
    title: "♯♭あり",
    desc: "両方の記号 + シャープ/フラット。黒鍵で答える",
    clefs: ["treble", "bass"],
    range: { treble: RANGE_T_STAFF, bass: RANGE_B_STAFF },
    accidentals: true,
  },
  {
    id: "ledger",
    title: "加線たっぷり",
    desc: "五線の外へ大きくはみ出す音。両方の記号",
    clefs: ["treble", "bass"],
    range: { treble: RANGE_T_WIDE, bass: RANGE_B_WIDE },
    accidentals: false,
  },
];

export interface Question {
  clef: Clef;
  pitch: Pitch;
}

const rnd = (n: number): number => Math.floor(Math.random() * n);

/** 直前と同じ音が続かないように 1 問作る */
export function makeQuestion(level: Level, prev?: Question): Question {
  for (let attempt = 0; attempt < 20; attempt++) {
    const clef = level.clefs[rnd(level.clefs.length)];
    const [lo, hi] = level.range[clef];
    const s = step(lo) + rnd(step(hi) - step(lo) + 1);
    let acc: Accidental = 0;
    if (level.accidentals && Math.random() < 0.6) {
      acc = Math.random() < 0.5 ? 1 : -1;
      const letter = s % 7;
      // E♯/B♯/C♭/F♭ は初心者向けに避ける
      if (
        (acc === 1 && (letter === 2 || letter === 6)) ||
        (acc === -1 && (letter === 0 || letter === 3))
      ) {
        acc = 0;
      }
    }
    const q: Question = { clef, pitch: fromStep(s, acc) };
    if (
      !prev ||
      prev.clef !== q.clef ||
      step(prev.pitch) !== s ||
      prev.pitch.acc !== acc
    ) {
      return q;
    }
  }
  const clef = level.clefs[0];
  return { clef, pitch: level.range[clef][0] };
}

export const QUESTIONS_PER_SET = 10;
