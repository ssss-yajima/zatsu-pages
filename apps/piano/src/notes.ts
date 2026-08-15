// 音高モデル。音名は「幹音（C〜B）+ オクターブ + 変化記号」で表す

/** 幹音の番号。0=C 1=D 2=E 3=F 4=G 5=A 6=B */
export type Letter = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** 変化記号。-1=♭ 0=なし 1=♯ */
export type Accidental = -1 | 0 | 1;
export type Clef = "treble" | "bass";

export interface Pitch {
  letter: Letter;
  /** 科学的ピッチ表記のオクターブ（中央のド = C4） */
  octave: number;
  acc: Accidental;
}

export const LETTER_EN = ["C", "D", "E", "F", "G", "A", "B"] as const;
export const LETTER_JA = ["ド", "レ", "ミ", "ファ", "ソ", "ラ", "シ"] as const;
const SEMITONE = [0, 2, 4, 5, 7, 9, 11] as const;

export const ACC_SYMBOL: Record<Accidental, string> = {
  [-1]: "♭",
  0: "",
  1: "♯",
};

/** 五線上の位置を表す整数（幹音の連番）。C4 = 28、1 増えると隣の線/間へ上がる */
export const step = (p: Pitch): number => p.octave * 7 + p.letter;

/** step から幹音を復元する（変化記号なし） */
export function fromStep(s: number, acc: Accidental = 0): Pitch {
  const octave = Math.floor(s / 7);
  return { letter: (s - octave * 7) as Letter, octave, acc };
}

export const midi = (p: Pitch): number =>
  12 * (p.octave + 1) + SEMITONE[p.letter] + p.acc;

/** 12 音のピッチクラス（0=C … 11=B）。C♯ と D♭ は同じ値になる */
export const pitchClass = (p: Pitch): number => ((midi(p) % 12) + 12) % 12;

export const freq = (p: Pitch): number => 440 * 2 ** ((midi(p) - 69) / 12);

/** 「ソ♯」のような日本語表記 */
export const nameJa = (p: Pitch): string =>
  `${LETTER_JA[p.letter]}${ACC_SYMBOL[p.acc]}`;

/** 「G♯4」のような英語表記 */
export const nameEn = (p: Pitch): string =>
  `${LETTER_EN[p.letter]}${ACC_SYMBOL[p.acc]}${p.octave}`;

/** 異名同音（C♯ ↔ D♭ など）があれば返す。幹音や E♯ 等の特殊なものは対象外 */
export function enharmonic(p: Pitch): Pitch | null {
  if (p.acc === 0) {
    return null;
  }
  const s = step(p) + p.acc;
  const q = fromStep(s, -p.acc as Accidental);
  return pitchClass(q) === pitchClass(p) ? q : null;
}

/** 便利コンストラクタ: pitch("C", 4, 1) → C♯4 */
export function pitch(
  letter: (typeof LETTER_EN)[number],
  octave: number,
  acc: Accidental = 0,
): Pitch {
  return { letter: LETTER_EN.indexOf(letter) as Letter, octave, acc };
}
