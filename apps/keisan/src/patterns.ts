// 問題パターンの定義
// 増やすときは PATTERNS に1つオブジェクトを足すだけ。
//   id    : 保存キーになるので変えない（変えると記録が別枠になる）
//   title : カードの見出し（ひらがな）
//   pairs : 固定の問題リスト。並び順だけ毎回シャッフルされる
// ルール: 答えはキーパッドの範囲に収まること／TOTAL 問ぶん用意すること

export type OpKey = "add" | "sub" | "mul";

export interface Op {
  sym: string;
  calc: (a: number, b: number) => number;
}

export const OPS: Record<OpKey, Op> = {
  add: { sym: "＋", calc: (a, b) => a + b },
  sub: { sym: "−", calc: (a, b) => a - b },
  mul: { sym: "×", calc: (a, b) => a * b }, // 将来用
};

export interface Pattern {
  id: string;
  level: 1 | 2;
  title: string;
  hint: string;
  op: OpKey;
  pairs: [number, number][];
  /** キーパッド範囲 [min, max] の手動指定（省略時は答えから自動算出） */
  pad?: [number, number];
}

/** 1セットの問題数 */
export const TOTAL = 20;

/** キーパッドの上限は5の倍数に切り上げる */
export const PAD_STEP = 5;

export const PATTERNS: Pattern[] = [
  {
    id: "add-basic", // id は保存キー。既存の記録を残したいなら変えない
    level: 1,
    title: "たしざん ①",
    hint: "こたえが 2〜10 の たしざん",
    op: "add",
    pairs: [
      [1, 1],
      [2, 1],
      [1, 3],
      [2, 2],
      [3, 2],
      [1, 4],
      [4, 2],
      [3, 3],
      [5, 1],
      [2, 5],
      [4, 3],
      [6, 1],
      [3, 5],
      [4, 4],
      [2, 6],
      [5, 4],
      [7, 2],
      [5, 5],
      [6, 4],
      [8, 2],
    ],
  },
  {
    id: "sub-basic",
    level: 1,
    title: "ひきざん ①",
    hint: "10までの かずの ひきざん",
    op: "sub",
    pairs: [
      [10, 1],
      [10, 2],
      [10, 3],
      [10, 5],
      [10, 6],
      [10, 8],
      [10, 9],
      [9, 2],
      [9, 4],
      [9, 7],
      [8, 1],
      [8, 3],
      [8, 6],
      [7, 2],
      [7, 4],
      [7, 6],
      [6, 1],
      [6, 4],
      [5, 3],
      [4, 3],
    ],
  },
  {
    id: "add-carry",
    level: 2,
    title: "たしざん ②",
    hint: "くりあがりの ある 1けた ＋ 1けた",
    op: "add",
    pairs: [
      [9, 2],
      [8, 3],
      [7, 4],
      [6, 5],
      [9, 4],
      [8, 5],
      [7, 6],
      [5, 8],
      [9, 6],
      [8, 7],
      [6, 9],
      [7, 8],
      [9, 8],
      [8, 9],
      [5, 7],
      [4, 9],
      [6, 6],
      [7, 7],
      [8, 8],
      [9, 9],
    ],
  },
  {
    id: "sub-borrow",
    level: 2,
    title: "ひきざん ②",
    hint: "くりさがりの ある 11〜18 − 1けた",
    op: "sub",
    pairs: [
      [11, 2],
      [11, 3],
      [11, 5],
      [11, 7],
      [11, 9],
      [12, 3],
      [12, 5],
      [12, 8],
      [12, 9],
      [13, 4],
      [13, 6],
      [13, 9],
      [14, 5],
      [14, 8],
      [14, 9],
      [15, 7],
      [15, 9],
      [16, 9],
      [17, 8],
      [18, 9],
    ],
  },
];

/** そのパターンで押せる数字の範囲。下限は答えの最小値、上限は5刻みに切り上げ */
export function padRange(p: Pattern): [number, number] {
  if (p.pad) {
    return p.pad;
  }
  const ans = p.pairs.map(([a, b]) => OPS[p.op].calc(a, b));
  return [Math.min(...ans), Math.ceil(Math.max(...ans) / PAD_STEP) * PAD_STEP];
}

/** 起動時チェック（コンソールに出るだけ。パターン追加時の保険） */
export function validatePatterns(): void {
  for (const p of PATTERNS) {
    if (p.pairs.length !== TOTAL) {
      console.warn(
        `[${p.id}] 問題数が ${p.pairs.length} 問です（${TOTAL} 問にしてください）`,
      );
    }
    const [lo, hi] = padRange(p);
    for (const [a, b] of p.pairs) {
      const v = OPS[p.op].calc(a, b);
      if (v < lo || v > hi) {
        console.warn(
          `[${p.id}] ${a}${OPS[p.op].sym}${b}=${v} はキーパッド(${lo}〜${hi})の外です`,
        );
      }
    }
    console.info(`[${p.id}] キーパッド ${lo}〜${hi}（${hi - lo + 1}キー）`);
  }
}
