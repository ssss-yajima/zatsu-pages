// 「まなぶ」の練習ドリル。ランダム生成の問題 + レッスンの確認クイズをまぜて出す
import { LESSONS, type Question } from "./lessons";
import {
  type Clef,
  fromStep,
  LETTER_EN,
  LETTER_JA,
  pitch,
  step,
} from "./notes";
import { type Dur, staffSvg } from "./staff";

export interface Drill {
  id: string;
  title: string;
  desc: string;
  gen: () => Question;
}

const rnd = (n: number): number => Math.floor(Math.random() * n);
const pick = <T>(arr: readonly T[]): T => arr[rnd(arr.length)];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 正解 + ダミーを混ぜて 4 択にする。answer は正解の index */
function choices4(
  correct: string,
  pool: readonly string[],
): { choices: string[]; answer: number } {
  const others = shuffle(pool.filter((c) => c !== correct)).slice(0, 3);
  const cs = shuffle([correct, ...others]);
  return { choices: cs, answer: cs.indexOf(correct) };
}

// ---- 音名変換 ----
function genNoteName(): Question {
  const i = rnd(7);
  if (Math.random() < 0.5) {
    const c = choices4(LETTER_JA[i], LETTER_JA);
    return {
      q: `英語の音名 ${LETTER_EN[i]} は？`,
      ...c,
      explain: `C=ド から順に ${LETTER_EN[i]}=${LETTER_JA[i]} です。`,
    };
  }
  const c = choices4(LETTER_EN[i], LETTER_EN);
  return {
    q: `「${LETTER_JA[i]}」を英語の音名で言うと？`,
    ...c,
    explain: `${LETTER_JA[i]} = ${LETTER_EN[i]}。ドが C、ラが A です。`,
  };
}

// ---- 音の長さ ----
const DUR_INFO: { dur: Dur; name: string; beats: number }[] = [
  { dur: "w", name: "全音符", beats: 4 },
  { dur: "h", name: "2分音符", beats: 2 },
  { dur: "q", name: "4分音符", beats: 1 },
  { dur: "e", name: "8分音符", beats: 0.5 },
  { dur: "s", name: "16分音符", beats: 0.25 },
];
const fmtBeats = (b: number): string => {
  if (Number.isInteger(b)) {
    return `${b}拍`;
  }
  return b === 0.5
    ? "½拍"
    : b === 0.25
      ? "¼拍"
      : b === 1.5
        ? "1.5拍"
        : b === 3
          ? "3拍"
          : b === 0.75
            ? "¾拍"
            : `${b}拍`;
};
const BEAT_POOL = [
  "¼拍",
  "½拍",
  "¾拍",
  "1拍",
  "1.5拍",
  "2拍",
  "3拍",
  "4拍",
  "6拍",
];

function genDuration(): Question {
  const kind = rnd(3);
  if (kind === 0) {
    // 図を見て名前を答える
    const d = pick(DUR_INFO);
    const svg = staffSvg({
      clef: "treble",
      items: [{ kind: "note", pitch: pitch("B", 4), dur: d.dur }],
      minWidth: 110,
    });
    const c = choices4(
      d.name,
      DUR_INFO.map((x) => x.name),
    );
    return {
      q: "この音符の名前は？",
      svg,
      ...c,
      explain: `${d.name}（4分音符=1拍で ${fmtBeats(d.beats)}）です。`,
    };
  }
  if (kind === 1) {
    // 付点つきの長さ
    const d = pick(DUR_INFO.slice(1, 4));
    const svg = staffSvg({
      clef: "treble",
      items: [{ kind: "note", pitch: pitch("B", 4), dur: d.dur, dots: 1 }],
      minWidth: 110,
    });
    const ans = fmtBeats(d.beats * 1.5);
    const c = choices4(ans, BEAT_POOL);
    return {
      q: "この音符は何拍？（4分音符=1拍）",
      svg,
      ...c,
      explain: `付点${d.name}。${fmtBeats(d.beats)} + その半分 = ${ans}。`,
    };
  }
  // 休符
  const d = pick(DUR_INFO.slice(0, 4));
  const svg = staffSvg({
    clef: "treble",
    items: [{ kind: "rest", dur: d.dur }],
    minWidth: 110,
  });
  const name = d.name.replace("音符", "休符");
  const c = choices4(
    name,
    DUR_INFO.map((x) => x.name.replace("音符", "休符")),
  );
  return {
    q: "この休符の名前は？",
    svg,
    ...c,
    explain: `${name}（${fmtBeats(d.beats)}休む）。全休符は線からぶら下がり、2分休符は線に乗ります。`,
  };
}

// ---- 拍子と小節 ----
function genMeter(): Question {
  const meters: [number, number][] = [
    [4, 4],
    [3, 4],
    [2, 4],
  ];
  const [top, bottom] = pick(meters);
  if (Math.random() < 0.4) {
    const c = choices4(`4分音符が1小節に${top}つ分`, [
      "4分音符が1小節に2つ分",
      "4分音符が1小節に3つ分",
      "4分音符が1小節に4つ分",
      "2分音符が1小節に4つ分",
      "8分音符が1小節に3つ分",
    ]);
    return {
      q: `${top}/${bottom} 拍子の意味は？`,
      ...c,
      explain: `下の ${bottom} は「4分音符を1拍と数える」、上の ${top} は「1小節に ${top} 拍」です。`,
    };
  }
  // 小節の残りを答える
  const total = top;
  const filled = shuffle(DUR_INFO.slice(1, 4)).filter(
    (d) => d.beats < total,
  )[0];
  const rest = total - filled.beats;
  const c = choices4(fmtBeats(rest), BEAT_POOL);
  const svg = staffSvg({
    clef: "treble",
    items: [
      { kind: "time", top, bottom },
      { kind: "note", pitch: pitch("G", 4), dur: filled.dur },
      { kind: "text", text: "?", y: 27, size: 20 },
      { kind: "bar" },
    ],
    minWidth: 130,
  });
  return {
    q: `${top}/${bottom} 拍子。${filled.name}のあと、この小節にあと何拍入る？`,
    svg,
    ...c,
    explain: `1小節は ${total} 拍。${filled.name}が ${fmtBeats(filled.beats)} なので、残りは ${fmtBeats(rest)}。`,
  };
}

// ---- 記号の意味 ----
const SYMBOLS: [string, string][] = [
  ["pp", "とても弱く"],
  ["p", "弱く"],
  ["mp", "少し弱く"],
  ["mf", "少し強く"],
  ["f", "強く"],
  ["ff", "とても強く"],
  ["cresc.", "だんだん強く"],
  ["dim.", "だんだん弱く"],
  ["rit.", "だんだん遅く"],
  ["a tempo", "元の速さで"],
  ["Andante", "歩くような速さで"],
  ["Allegro", "速く"],
  ["Adagio", "ゆるやかに"],
  ["Presto", "とても速く"],
  ["♯", "半音上げる"],
  ["♭", "半音下げる"],
  ["♮", "元の音に戻す"],
  ["D.C.", "曲の頭に戻る"],
  ["Fine", "ここで終わる"],
  ["8va", "1オクターブ上で弾く"],
  ["スタッカート", "短く切って弾く"],
  ["タイ", "同じ高さの音をつなげて1つの長さにする"],
  ["スラー", "なめらかにつなげて弾く"],
  ["フェルマータ", "その音を十分に伸ばす"],
];
function genSymbol(): Question {
  const [sym, meaning] = pick(SYMBOLS);
  if (Math.random() < 0.5) {
    const c = choices4(
      meaning,
      SYMBOLS.map((x) => x[1]),
    );
    return {
      q: `「${sym}」の意味は？`,
      ...c,
      explain: `${sym} = ${meaning}。`,
    };
  }
  const c = choices4(
    sym,
    SYMBOLS.map((x) => x[0]),
  );
  return {
    q: `「${meaning}」を表す記号・言葉は？`,
    ...c,
    explain: `${meaning} = ${sym}。`,
  };
}

// ---- 譜面の音 ----
function genStaffNote(): Question {
  const clef: Clef = Math.random() < 0.5 ? "treble" : "bass";
  const [lo, hi] =
    clef === "treble"
      ? [step(pitch("C", 4)), step(pitch("A", 5))]
      : [step(pitch("F", 2)), step(pitch("C", 4))];
  const p = fromStep(lo + rnd(hi - lo + 1));
  const svg = staffSvg({
    clef,
    items: [{ kind: "note", pitch: p }],
    minWidth: 110,
  });
  const c = choices4(LETTER_JA[p.letter], LETTER_JA);
  return {
    q: `この音は？（${clef === "treble" ? "ト音記号" : "ヘ音記号"}）`,
    svg,
    ...c,
    explain: `${LETTER_JA[p.letter]}（${LETTER_EN[p.letter]}${p.octave}）です。${clef === "treble" ? "第2線のソ" : "第4線のファ"}を目印に数えましょう。`,
  };
}

// ---- レッスンの復習 ----
function genLessonReview(): Question {
  const all = LESSONS.flatMap((l) => l.quiz);
  return pick(all);
}

export const DRILLS: Drill[] = [
  {
    id: "mix",
    title: "ぜんぶミックス",
    desc: "下の全種類からランダム。総復習に",
    gen: () => pick(DRILLS.slice(1)).gen(),
  },
  {
    id: "names",
    title: "音名の変換",
    desc: "ドレミ ↔ CDEFGAB",
    gen: genNoteName,
  },
  {
    id: "staff",
    title: "譜面の音",
    desc: "ト音・ヘ音記号の1音を4択で",
    gen: genStaffNote,
  },
  {
    id: "duration",
    title: "音の長さ",
    desc: "音符・休符の名前、付点の拍数",
    gen: genDuration,
  },
  {
    id: "meter",
    title: "拍子と小節",
    desc: "拍子記号の意味、小節の残り拍",
    gen: genMeter,
  },
  {
    id: "symbols",
    title: "記号の意味",
    desc: "強弱・速度・奏法・反復の記号",
    gen: genSymbol,
  },
  {
    id: "review",
    title: "レッスンの復習",
    desc: "各レッスンの確認クイズをシャッフル",
    gen: genLessonReview,
  },
];

export const DRILL_COUNT = 10;

/** 同じ問題文が続かないように DRILL_COUNT 問つくる */
export function makeDrill(drill: Drill): Question[] {
  const out: Question[] = [];
  const seen = new Set<string>();
  let guard = 0;
  while (out.length < DRILL_COUNT && guard++ < 200) {
    const q = drill.gen();
    const key = q.q + (q.svg ?? "");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(q);
  }
  return out;
}
