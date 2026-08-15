// 教科書用の図。すべて SVG 文字列を返す（外部画像なし）
import { LETTER_JA, midi, type Pitch, pitch } from "../notes";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const svgOpen = (w: number, h: number, label: string): string =>
  `<svg class="fig-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(label)}">`;

// ---------------------------------------------------------------------------
// 鍵盤図
// ---------------------------------------------------------------------------
export interface KeyMark {
  pitch: Pitch;
  /** 鍵盤の上に出す文字（指番号など） */
  label?: string;
  /** 色: accent(オレンジ) / good(緑) / blue */
  color?: "accent" | "good" | "blue" | "gray";
}

export interface KeyboardOpts {
  /** 開始オクターブと白鍵の数 */
  from?: Pitch;
  whiteKeys?: number;
  marks?: KeyMark[];
  /** ドの鍵盤に「ド」を書く */
  showC?: boolean;
  /** 全白鍵に音名を書く */
  showNames?: boolean;
  /** 図の説明（aria-label に使う） */
  caption?: string;
  /** 曲線矢印: from → to（マーク番号）。親指くぐりの説明用 */
  arrows?: [number, number][];
}

const COLORS = {
  accent: "#b5542d",
  good: "#1f7a4d",
  blue: "#2563eb",
  gray: "#9a938a",
};

/** 白鍵の並び（C から）: 各白鍵の後ろに黒鍵があるか */
const HAS_BLACK_AFTER = [true, true, false, true, true, true, false];

export function keyboard(opts: KeyboardOpts = {}): string {
  const from = opts.from ?? pitch("C", 4);
  const n = opts.whiteKeys ?? 15;
  const W = 40;
  const H = 130;
  const BW = 24;
  const BH = 80;
  const top = opts.marks?.some((m) => m.label) ? 26 : 8;
  const width = n * W + 2;
  const height = top + H + 8;
  let out = svgOpen(width, height, opts.caption ?? "鍵盤の図");

  // 白鍵の一覧（midi と letter）
  const whites: { midi: number; letter: number; octave: number; x: number }[] =
    [];
  let letter = from.letter as number;
  let octave = from.octave;
  for (let i = 0; i < n; i++) {
    const p: Pitch = { letter: letter as Pitch["letter"], octave, acc: 0 };
    whites.push({ midi: midi(p), letter, octave, x: 1 + i * W });
    letter++;
    if (letter === 7) {
      letter = 0;
      octave++;
    }
  }
  const markFor = (m: number): KeyMark | undefined =>
    opts.marks?.find((k) => midi(k.pitch) === m);

  // 白鍵
  for (const w of whites) {
    const mk = markFor(w.midi);
    const fill = mk ? COLORS[mk.color ?? "accent"] : "#fff";
    out += `<rect x="${w.x}" y="${top}" width="${W}" height="${H}" fill="#fff" stroke="#7a7268" stroke-width="1" rx="2"/>`;
    if (mk) {
      // 薄い色をかぶせて、指の位置に丸を打つ
      out += `<rect x="${w.x}" y="${top}" width="${W}" height="${H}" fill="${fill}" opacity="0.18" rx="2"/>`;
      out += `<circle cx="${w.x + W / 2}" cy="${top + H - 22}" r="9" fill="${fill}"/>`;
    }
    const isC = w.letter === 0;
    if (opts.showNames || (opts.showC && isC)) {
      out += `<text x="${w.x + W / 2}" y="${top + H - 6}" text-anchor="middle" font-size="11" fill="#333" font-weight="${isC ? 700 : 400}">${LETTER_JA[w.letter]}${isC && !opts.showNames ? w.octave : ""}</text>`;
    }
    if (mk?.label) {
      out += `<text x="${w.x + W / 2}" y="${top - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="${fill}">${esc(mk.label)}</text>`;
    }
  }
  // 黒鍵
  for (let i = 0; i < whites.length - 1; i++) {
    const w = whites[i];
    if (!HAS_BLACK_AFTER[w.letter]) {
      continue;
    }
    const x = w.x + W - BW / 2;
    const mk = markFor(w.midi + 1);
    const fill = mk ? COLORS[mk.color ?? "accent"] : "#1a1613";
    out += `<rect x="${x}" y="${top}" width="${BW}" height="${BH}" fill="${fill}" rx="2"/>`;
    if (mk?.label) {
      out += `<text x="${x + BW / 2}" y="${top - 8}" text-anchor="middle" font-size="14" font-weight="700" fill="${fill}">${esc(mk.label)}</text>`;
    }
  }
  // 矢印（親指くぐり等）
  if (opts.arrows && opts.marks) {
    for (const [a, b] of opts.arrows) {
      const ma = opts.marks[a];
      const mb = opts.marks[b];
      const xa = whites.find((w) => w.midi === midi(ma.pitch))?.x;
      const xb = whites.find((w) => w.midi === midi(mb.pitch))?.x;
      if (xa === undefined || xb === undefined) {
        continue;
      }
      const y = top + H - 22;
      const x1 = xa + W / 2;
      const x2 = xb + W / 2;
      // 丸の下をくぐるように、鍵盤の下端ぎりぎりを通る弧
      out += `<path d="M${x1},${y + 10} Q${(x1 + x2) / 2},${y + 30} ${x2},${y + 12}" fill="none" stroke="${COLORS.blue}" stroke-width="2.5" stroke-dasharray="4 3"/>`;
      out += `<polygon points="${x2},${y + 8} ${x2 - 6},${y + 18} ${x2 + 6},${y + 18}" fill="${COLORS.blue}"/>`;
    }
  }
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// 手の形（上から見た図・指番号）
// ---------------------------------------------------------------------------
export function hands(): string {
  const W = 420;
  const H = 210;
  let out = svgOpen(W, H, "両手の指番号。親指が1、小指が5");
  const hand = (cx: number, mirror: boolean, label: string): void => {
    const s = mirror ? -1 : 1;
    // 手のひら
    out += `<ellipse cx="${cx}" cy="145" rx="46" ry="42" fill="#fde9d9" stroke="#b5542d" stroke-width="1.5"/>`;
    // 指: [dx, 長さ, 太さ, 番号]。mirror で左右反転（左手）
    const fingers: [number, number, number, number][] = [
      [-62, 42, 15, 1], // 親指（横に出る）
      [-30, 82, 14, 2],
      [-9, 92, 14, 3],
      [12, 84, 13, 4],
      [32, 64, 12, 5],
    ];
    for (const [dx, len, wd, num] of fingers) {
      const x = cx + s * dx;
      if (num === 1) {
        // 親指は斜め
        out += `<g transform="rotate(${s * 40} ${x} 130)"><rect x="${x - wd / 2}" y="${130 - len}" width="${wd}" height="${len + 10}" rx="7" fill="#fde9d9" stroke="#b5542d" stroke-width="1.5"/></g>`;
        out += `<text x="${x + s * 42}" y="96" text-anchor="middle" font-size="16" font-weight="700" fill="#b5542d">1</text>`;
      } else {
        out += `<rect x="${x - wd / 2}" y="${125 - len}" width="${wd}" height="${len + 10}" rx="7" fill="#fde9d9" stroke="#b5542d" stroke-width="1.5"/>`;
        out += `<text x="${x}" y="${115 - len}" text-anchor="middle" font-size="16" font-weight="700" fill="#b5542d">${num}</text>`;
      }
    }
    out += `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="13" fill="#333">${label}</text>`;
  };
  hand(110, true, "左手");
  hand(310, false, "右手");
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// 姿勢（横から）
// ---------------------------------------------------------------------------
export function posture(): string {
  const W = 440;
  const H = 240;
  let out = svgOpen(W, H, "ピアノに向かう姿勢の横から見た図");
  const ink = "#333";
  const ac = "#b5542d";
  // 床
  out += `<line x1="150" y1="222" x2="430" y2="222" stroke="#bbb" stroke-width="2"/>`;
  // ピアノ本体（奥）と鍵盤（手前に張り出す）
  out += `<rect x="360" y="50" width="70" height="172" fill="#3a3430"/>`;
  out += `<rect x="300" y="120" width="62" height="10" fill="#fff" stroke="#333"/>`;
  out += `<rect x="300" y="130" width="62" height="92" fill="#4a423c"/>`;
  out += `<text x="331" y="146" text-anchor="middle" font-size="11" fill="#fff">鍵盤</text>`;
  // 椅子
  out += `<rect x="150" y="150" width="90" height="8" fill="#8b6b4a"/>`;
  out += `<line x1="160" y1="158" x2="160" y2="222" stroke="#8b6b4a" stroke-width="5"/>`;
  out += `<line x1="230" y1="158" x2="230" y2="222" stroke="#8b6b4a" stroke-width="5"/>`;
  // 人: 頭・胴・腕・脚（椅子の前半分に座る）
  const bx = 225; // 背骨の x
  out += `<circle cx="${bx}" cy="52" r="16" fill="#fde9d9" stroke="${ink}" stroke-width="2"/>`;
  out += `<line x1="${bx}" y1="68" x2="${bx - 3}" y2="150" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  out += `<line x1="${bx - 3}" y1="150" x2="${bx + 52}" y2="150" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  out += `<line x1="${bx + 52}" y1="150" x2="${bx + 55}" y2="222" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`;
  out += `<line x1="${bx + 45}" y1="222" x2="${bx + 70}" y2="222" stroke="${ink}" stroke-width="4" stroke-linecap="round"/>`; // 足
  // 腕: 肩 → 肘 → 手首（鍵盤の高さ）
  const elbow: [number, number] = [bx + 45, 126];
  out += `<polyline points="${bx},82 ${elbow[0]},${elbow[1]} 304,121" fill="none" stroke="${ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  out += `<circle cx="${elbow[0]}" cy="${elbow[1]}" r="4" fill="${ac}"/>`;
  // 肘の高さ ＝ 鍵盤の高さ（水平の点線）
  out += `<line x1="${elbow[0]}" y1="${elbow[1]}" x2="300" y2="${elbow[1]}" stroke="${ac}" stroke-dasharray="3 3"/>`;
  // 注釈（左の列にそろえ、点線で対象へ）
  const note = (
    y: number,
    t: string,
    tx: number,
    ty: number,
    color = ac,
  ): void => {
    out += `<text x="8" y="${y}" font-size="11.5" fill="${color}" font-weight="700">${t}</text>`;
    out += `<line x1="${8 + t.length * 11.5 + 4}" y1="${y - 4}" x2="${tx}" y2="${ty}" stroke="${color}" stroke-dasharray="2 3"/>`;
  };
  note(38, "頭は背骨の上に", bx - 16, 50);
  note(96, "背中はまっすぐ・肩は下ろす", bx - 2, 92);
  note(134, "肘 ≒ 鍵盤の高さ", elbow[0] - 6, elbow[1]);
  note(178, "椅子の前半分に座る", 190, 156, "#555");
  note(214, "足は床にしっかり", bx + 50, 220);
  out += `<text x="331" y="108" text-anchor="middle" font-size="11" fill="#2563eb" font-weight="700">手首は平行</text>`;
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// 手の丸み（正面から）
// ---------------------------------------------------------------------------
export function handArch(): string {
  const W = 420;
  const H = 170;
  let out = svgOpen(W, H, "良い手の形と悪い手の形の比較");
  const draw = (cx: number, good: boolean): void => {
    // 鍵盤面
    out += `<rect x="${cx - 90}" y="120" width="180" height="14" fill="#fff" stroke="#7a7268"/>`;
    for (let i = 1; i < 6; i++) {
      out += `<line x1="${cx - 90 + i * 30}" y1="120" x2="${cx - 90 + i * 30}" y2="134" stroke="#7a7268"/>`;
    }
    if (good) {
      // アーチ状の手（手首から指先へ半円）
      out += `<path d="M${cx - 80},112 C${cx - 70},60 ${cx - 20},40 ${cx + 10},44 C${cx + 45},48 ${cx + 60},80 ${cx + 60},112" fill="#fde9d9" stroke="#1f7a4d" stroke-width="2.5"/>`;
      // 指先の接点
      for (const dx of [-75, -45, -15, 15, 45]) {
        out += `<circle cx="${cx + dx}" cy="118" r="4" fill="#1f7a4d"/>`;
      }
      out += `<text x="${cx}" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#1f7a4d">◯ 卵をふわっと持つ丸み</text>`;
      out += `<text x="${cx}" y="158" text-anchor="middle" font-size="11" fill="#333">指先の腹で鍵盤に触れる・手首は落ちない</text>`;
    } else {
      // つぶれた手
      out += `<path d="M${cx - 80},112 C${cx - 60},100 ${cx - 20},96 ${cx + 10},98 C${cx + 45},100 ${cx + 60},108 ${cx + 60},112" fill="#fde9d9" stroke="#b3261e" stroke-width="2.5"/>`;
      out += `<text x="${cx}" y="26" text-anchor="middle" font-size="13" font-weight="700" fill="#b3261e">✕ 指がのびて手首が落ちる</text>`;
      out += `<text x="${cx}" y="158" text-anchor="middle" font-size="11" fill="#333">関節がへこむ・鍵盤を「押し込む」形</text>`;
    }
  };
  draw(110, true);
  draw(310, false);
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// 練習のサイクル
// ---------------------------------------------------------------------------
export function practiceLoop(): string {
  const W = 420;
  const H = 150;
  let out = svgOpen(W, H, "区切って練習するサイクルの図");
  const boxes = [
    "区切る\n(2〜4小節)",
    "片手ずつ\nゆっくり",
    "両手で\nゆっくり",
    "テンポを\n少し上げる",
    "前後と\nつなぐ",
  ];
  const bw = 72;
  const gap = 12;
  boxes.forEach((t, i) => {
    const x = 6 + i * (bw + gap);
    out += `<rect x="${x}" y="40" width="${bw}" height="60" rx="10" fill="#fff" stroke="#b5542d" stroke-width="1.5"/>`;
    const [l1, l2] = t.split("\n");
    out += `<text x="${x + bw / 2}" y="64" text-anchor="middle" font-size="12" font-weight="700" fill="#333">${l1}</text>`;
    out += `<text x="${x + bw / 2}" y="82" text-anchor="middle" font-size="11" fill="#555">${l2}</text>`;
    if (i < boxes.length - 1) {
      out += `<polygon points="${x + bw + 2},70 ${x + bw + 10},66 ${x + bw + 10},74" fill="#b5542d"/>`;
    }
  });
  // 戻る矢印
  out += `<path d="M${6 + 4 * (bw + gap) + bw / 2},102 C${6 + 4 * (bw + gap) + bw / 2},130 ${6 + bw / 2},130 ${6 + bw / 2},104" fill="none" stroke="#2563eb" stroke-width="2" stroke-dasharray="4 3"/>`;
  out += `<polygon points="${6 + bw / 2},100 ${6 + bw / 2 - 5},110 ${6 + bw / 2 + 5},110" fill="#2563eb"/>`;
  out += `<text x="${W / 2}" y="140" text-anchor="middle" font-size="11" fill="#2563eb">弾けたら次の区切りへ（3回連続で成功したら合格）</text>`;
  out += `<text x="${W / 2}" y="22" text-anchor="middle" font-size="12" fill="#333">1つの区切りに 3〜5 分。通し弾きは最後に1回だけ</text>`;
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// テンポの上げ方（階段）
// ---------------------------------------------------------------------------
export function tempoLadder(): string {
  const W = 420;
  const H = 160;
  let out = svgOpen(W, H, "テンポを段階的に上げる図");
  const steps = [60, 66, 72, 80, 88, 96];
  steps.forEach((bpm, i) => {
    const x = 20 + i * 64;
    const y = 120 - i * 16;
    out += `<rect x="${x}" y="${y}" width="56" height="${140 - y}" fill="${i === steps.length - 1 ? "#b5542d" : "#f3e7dc"}" stroke="#b5542d"/>`;
    out += `<text x="${x + 28}" y="${y - 6}" text-anchor="middle" font-size="12" font-weight="700" fill="#333">♩=${bpm}</text>`;
  });
  out += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="12" fill="#333">「3回続けてノーミス」で1段上げる。ミスしたら1段下げる</text>`;
  out += `<text x="${W / 2}" y="156" text-anchor="middle" font-size="11" fill="#555">目標テンポの 6〜7 割から始める。上げ幅は 5〜10%</text>`;
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// ペダルのタイミング
// ---------------------------------------------------------------------------
export function pedalTiming(): string {
  const W = 420;
  const H = 150;
  let out = svgOpen(W, H, "ペダルを踏みかえるタイミングの図");
  // 和音の打鍵（縦線）
  const hits = [110, 200, 290, 380];
  out += `<text x="10" y="30" font-size="12" fill="#333">和音を弾く</text>`;
  hits.forEach((x, i) => {
    out += `<line x1="${x}" y1="36" x2="${x}" y2="60" stroke="#333" stroke-width="3"/>`;
    out += `<text x="${x}" y="30" text-anchor="middle" font-size="11" fill="#555">${["ドミソ", "ファラド", "ソシレ", "ドミソ"][i]}</text>`;
  });
  // ペダル線: 弾いた「直後」に踏みかえる
  out += `<text x="10" y="100" font-size="12" fill="#333">ペダル</text>`;
  let d = "M80,120";
  for (const x of hits) {
    d += ` L${x + 6},120 L${x + 12},96 L${x + 18},120`;
  }
  d += " L410,120";
  out += `<path d="${d}" fill="none" stroke="#2563eb" stroke-width="2.5"/>`;
  out += `<text x="240" y="140" text-anchor="middle" font-size="11" fill="#2563eb">踏む＝線が下 ／ 弾いた直後に一瞬上げてすぐ踏む（音が濁らない）</text>`;
  hits.forEach((x) => {
    out += `<line x1="${x}" y1="60" x2="${x + 12}" y2="96" stroke="#b5542d" stroke-dasharray="3 3"/>`;
  });
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// フレーズの山（強弱の曲線）
// ---------------------------------------------------------------------------
export function phraseArc(): string {
  const W = 420;
  const H = 130;
  let out = svgOpen(W, H, "フレーズの山と強弱の関係");
  out += `<path d="M20,100 C120,20 300,20 400,100" fill="none" stroke="#b5542d" stroke-width="3"/>`;
  out += `<line x1="20" y1="100" x2="400" y2="100" stroke="#bbb"/>`;
  out += `<text x="20" y="118" font-size="12" fill="#333">p 弱く入る</text>`;
  out += `<text x="210" y="30" text-anchor="middle" font-size="12" font-weight="700" fill="#b5542d">山（いちばん強く）</text>`;
  out += `<text x="400" y="118" text-anchor="end" font-size="12" fill="#333">p おさめる</text>`;
  out += `<text x="110" y="70" text-anchor="middle" font-size="12" fill="#555">＜ cresc.</text>`;
  out += `<text x="310" y="70" text-anchor="middle" font-size="12" fill="#555">dim. ＞</text>`;
  return `${out}</svg>`;
}

// ---------------------------------------------------------------------------
// 週間プラン（棒グラフ風）
// ---------------------------------------------------------------------------
export function weekPlan(): string {
  const W = 420;
  const H = 150;
  let out = svgOpen(W, H, "1週間の練習配分の例");
  const days = ["月", "火", "水", "木", "金", "土", "日"];
  const mins = [20, 20, 20, 20, 20, 30, 0];
  days.forEach((d, i) => {
    const x = 20 + i * 56;
    const h = mins[i] * 3;
    out += `<rect x="${x}" y="${110 - h}" width="40" height="${h}" fill="${mins[i] === 0 ? "#eee" : "#b5542d"}" rx="3"/>`;
    out += `<text x="${x + 20}" y="128" text-anchor="middle" font-size="12" fill="#333">${d}</text>`;
    out += `<text x="${x + 20}" y="${104 - h}" text-anchor="middle" font-size="11" fill="#555">${mins[i] === 0 ? "休" : `${mins[i]}分`}</text>`;
  });
  out += `<text x="${W / 2}" y="18" text-anchor="middle" font-size="12" fill="#333">毎日 20 分 ＞ 週末に 2 時間。休みの日を1日決めておく</text>`;
  return `${out}</svg>`;
}
