// 楽譜を SVG 文字列として描画する。外部フォントに頼らず、記号はすべてパスで描く
import { type Clef, type Pitch, step } from "./notes";

/** 音価。w=全音符 h=2分 q=4分 e=8分 s=16分 */
export type Dur = "w" | "h" | "q" | "e" | "s";

export type StaffItem =
  | {
      kind: "note";
      pitch: Pitch;
      dur?: Dur;
      dots?: number;
      /** 音符の下に出す文字（音名など） */
      label?: string;
      /** 音符グループに付ける class（正解/不正解の色付け用） */
      cls?: string;
      /** 音符の右上に出す指番号など */
      finger?: string;
    }
  | { kind: "rest"; dur: Dur; dots?: number; label?: string }
  | { kind: "bar" }
  | { kind: "end" }
  | { kind: "time"; top: number; bottom: number }
  | {
      kind: "text";
      text: string;
      /** 第5線からの縦オフセット（省略時は五線の下） */
      y?: number;
      italic?: boolean;
      size?: number;
    };

export interface StaffOpts {
  clef: Clef;
  items?: StaffItem[];
  /** 描画しない（音符なしの五線だけ出したい時用） */
  noClef?: boolean;
  /** 最低幅（viewBox 単位）。線間隔は 10 */
  minWidth?: number;
  /** 上下の余白を固定したい時（例: 大譜表で高さを揃える） */
  padTop?: number;
  padBottom?: number;
  /** ラベル用の追加余白 */
  ariaLabel?: string;
}

const G = 10; // 線の間隔
const MID_STEP: Record<Clef, number> = { treble: 34, bass: 22 }; // 中央の線にある音の step
const CLEF_W = 32;

/** step → 中央線からの y オフセット */
const dy = (clef: Clef, s: number): number => -(s - MID_STEP[clef]) * (G / 2);

/** Catmull-Rom 補間で点列を滑らかなパスにする */
function smooth(pts: [number, number][], ox: number, oy: number): string {
  const p = pts.map(([x, y]) => [x + ox, y + oy] as const);
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[i - 1] ?? p[i];
    const p1 = p[i];
    const p2 = p[i + 1];
    const p3 = p[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${r(c1x)},${r(c1y)} ${r(c2x)},${r(c2y)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const r = (n: number): string => (Math.round(n * 10) / 10).toString();

/** ト音記号。ox,oy は五線の左上（第5線の左端） */
function trebleClef(ox: number, oy: number): string {
  const pts: [number, number][] = [
    [8, 49],
    [5, 52.5],
    [8.5, 55.5],
    [12.5, 52],
    [12, 45],
    [10, 30],
    [8, 14],
    [8.5, 0],
    [12, -10],
    [15, -14],
    [17.5, -8],
    [16.5, 2],
    [10, 11],
    [4, 20],
    [3, 30],
    [7, 38],
    [14, 40],
    [20, 35],
    [19, 27],
    [13, 23.5],
    [8, 27],
    [8.5, 33],
    [12, 34.5],
  ];
  const d = smooth(pts, ox, oy);
  return (
    `<path d="${d}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="${ox + 8.5}" cy="${oy + 55.3}" r="3" fill="currentColor"/>`
  );
}

/** ヘ音記号 */
function bassClef(ox: number, oy: number): string {
  const x = ox + 3;
  const y = oy;
  return (
    `<circle cx="${x + 3.5}" cy="${y + 10}" r="3.4" fill="currentColor"/>` +
    `<path d="M${x + 3},${y + 11} C${x + 4},${y - 1} ${x + 19},${y - 2} ${x + 19},${y + 10} C${x + 19},${y + 21} ${x + 10},${y + 30} ${x + 1},${y + 35}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/>` +
    `<circle cx="${x + 24.5}" cy="${y + 5}" r="1.9" fill="currentColor"/>` +
    `<circle cx="${x + 24.5}" cy="${y + 15}" r="1.9" fill="currentColor"/>`
  );
}

function accidental(acc: -1 | 0 | 1, x: number, y: number): string {
  const s = 'stroke="currentColor" stroke-linecap="round"';
  if (acc === 1) {
    return (
      `<g ${s} stroke-width="1.4"><line x1="${x - 3.2}" y1="${y - 9}" x2="${x - 3.2}" y2="${y + 7}"/><line x1="${x + 0.8}" y1="${y - 10}" x2="${x + 0.8}" y2="${y + 6}"/></g>` +
      `<g ${s} stroke-width="2.4"><line x1="${x - 5.5}" y1="${y - 1.5}" x2="${x + 3}" y2="${y - 4}"/><line x1="${x - 5.5}" y1="${y + 4.5}" x2="${x + 3}" y2="${y + 2}"/></g>`
    );
  }
  if (acc === -1) {
    return (
      `<line x1="${x - 2}" y1="${y - 13}" x2="${x - 2}" y2="${y + 4}" ${s} stroke-width="1.5"/>` +
      `<path d="M${x - 2},${y + 4} C${x + 6},${y - 1} ${x + 4},${y - 8} ${x - 2},${y - 3.5}" fill="none" ${s} stroke-width="1.8"/>`
    );
  }
  return "";
}

/** 8分/16分音符の旗 */
function flag(x: number, y: number, up: boolean, n: number): string {
  let out = "";
  const dir = up ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const y0 = y + dir * i * 7;
    out += `<path d="M${x},${y0} c1,${dir * 6} 8,${dir * 8} 6,${dir * 18} c1,${-dir * 6} -2,${-dir * 10} -6,${-dir * 12} z" fill="currentColor"/>`;
  }
  return out;
}

function noteHead(x: number, y: number, hollow: boolean): string {
  const rot = `transform="rotate(-20 ${x} ${y})"`;
  if (hollow) {
    return `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.2" ${rot} fill="none" stroke="currentColor" stroke-width="2.2"/>`;
  }
  return `<ellipse cx="${x}" cy="${y}" rx="6.2" ry="4.4" ${rot} fill="currentColor"/>`;
}

function rest(dur: Dur, x: number, mid: number): string {
  const s =
    'stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
  switch (dur) {
    case "w":
      return `<rect x="${x - 6}" y="${mid - 10}" width="12" height="5" fill="currentColor"/>`;
    case "h":
      return `<rect x="${x - 6}" y="${mid - 5}" width="12" height="5" fill="currentColor"/>`;
    case "q":
      return `<path d="M${x - 3},${mid - 14} l6,7 l-6,7 l6,8 c-6,-4 -8,3 -2,7" fill="none" ${s} stroke-width="3"/>`;
    case "e":
      return (
        `<circle cx="${x - 3}" cy="${mid - 4}" r="2.6" fill="currentColor"/>` +
        `<path d="M${x + 4},${mid - 6} q-3,5 -7,2 M${x + 4},${mid - 6} L${x - 1},${mid + 9}" fill="none" ${s} stroke-width="1.8"/>`
      );
    case "s":
      return (
        `<circle cx="${x - 3}" cy="${mid - 4}" r="2.4" fill="currentColor"/>` +
        `<circle cx="${x - 5}" cy="${mid + 3}" r="2.4" fill="currentColor"/>` +
        `<path d="M${x + 4},${mid - 6} q-3,5 -7,2 M${x + 2},${mid + 1} q-3,5 -7,2 M${x + 4},${mid - 6} L${x - 2},${mid + 12}" fill="none" ${s} stroke-width="1.8"/>`
      );
  }
}

function labelWidth(label: string | undefined): number {
  if (!label) {
    return 0;
  }
  let w = 8;
  for (const ch of label) {
    w += ch.charCodeAt(0) > 0x2e7f ? 10 : 6;
  }
  return w;
}

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * 楽譜を描画する。返り値は <svg> 文字列
 */
export function staffSvg(opts: StaffOpts): string {
  const items = opts.items ?? [];
  const clef = opts.clef;

  // 縦方向の範囲を決める（加線が多いときは余白を広げる）
  let minDy = -2 * G;
  let maxDy = 2 * G;
  let hasLabel = false;
  for (const it of items) {
    if (it.kind === "note") {
      const d = dy(clef, step(it.pitch));
      minDy = Math.min(minDy, d - 3 * G);
      maxDy = Math.max(maxDy, d + 3 * G);
    }
    if ((it.kind === "note" || it.kind === "rest") && it.label) {
      hasLabel = true;
    }
  }
  const padTop = opts.padTop ?? Math.max(2.5 * G, -minDy - 2 * G + 6);
  const padBottom =
    (opts.padBottom ?? Math.max(2.5 * G, maxDy - 2 * G + 6)) +
    (hasLabel ? 16 : 0);
  const top = padTop; // 第5線の y
  const mid = top + 2 * G; // 第3線の y

  // 横方向のレイアウト
  let x = 8 + (opts.noClef ? 0 : CLEF_W);
  const placed: { it: StaffItem; x: number }[] = [];
  for (const it of items) {
    switch (it.kind) {
      case "note":
      case "rest": {
        const base = it.kind === "note" && it.pitch.acc !== 0 ? 38 : 30;
        // ラベルが長いときは重ならないよう間隔を広げる（全角 1 文字 ≒ 10 単位）
        const w = Math.max(base, labelWidth(it.label));
        placed.push({ it, x: x + w / 2 + 2 });
        x += w;
        break;
      }
      case "bar":
        placed.push({ it, x: x + 6 });
        x += 12;
        break;
      case "end":
        placed.push({ it, x: x + 8 });
        x += 14;
        break;
      case "time":
        placed.push({ it, x: x + 8 });
        x += 22;
        break;
      case "text":
        placed.push({ it, x });
        x += Math.max(24, it.text.length * 8);
        break;
    }
  }
  const width = Math.max(opts.minWidth ?? 120, x + 8);
  const height = top + 4 * G + padBottom;

  let out = "";
  // 五線
  for (let i = 0; i < 5; i++) {
    const y = top + i * G;
    out += `<line x1="6" y1="${y}" x2="${width - 6}" y2="${y}" stroke="currentColor" stroke-width="1"/>`;
  }
  if (!opts.noClef) {
    out += clef === "treble" ? trebleClef(6, top) : bassClef(6, top);
  }

  for (const { it, x } of placed) {
    switch (it.kind) {
      case "note": {
        const s = step(it.pitch);
        const y = mid + dy(clef, s);
        const dur = it.dur ?? "q";
        let g = `<g class="note ${it.cls ?? ""}">`;
        // 加線
        const midStep = MID_STEP[clef];
        for (let ls = midStep + 6; ls <= s; ls += 2) {
          const ly = mid + dy(clef, ls);
          g += `<line x1="${x - 10}" y1="${ly}" x2="${x + 10}" y2="${ly}" stroke="currentColor" stroke-width="1.2"/>`;
        }
        for (let ls = midStep - 6; ls >= s; ls -= 2) {
          const ly = mid + dy(clef, ls);
          g += `<line x1="${x - 10}" y1="${ly}" x2="${x + 10}" y2="${ly}" stroke="currentColor" stroke-width="1.2"/>`;
        }
        g += accidental(it.pitch.acc, x - 12, y);
        g += noteHead(x, y, dur === "w" || dur === "h");
        if (dur !== "w") {
          const up = s < midStep;
          const sx = up ? x + 5.6 : x - 5.6;
          const sy = up ? y - 33 : y + 33;
          g += `<line x1="${sx}" y1="${y}" x2="${sx}" y2="${sy}" stroke="currentColor" stroke-width="1.6"/>`;
          if (dur === "e" || dur === "s") {
            g += flag(sx, sy, up, dur === "e" ? 1 : 2);
          }
        }
        for (let i = 0; i < (it.dots ?? 0); i++) {
          // 線上の音は付点を上の間に打つ
          const dotY = s % 2 === midStep % 2 ? y - G / 2 : y;
          g += `<circle cx="${x + 10 + i * 5}" cy="${dotY}" r="1.7" fill="currentColor"/>`;
        }
        if (it.finger) {
          g += `<text x="${x}" y="${Math.min(y, mid - 2 * G) - 14}" text-anchor="middle" font-size="9" fill="currentColor">${esc(it.finger)}</text>`;
        }
        if (it.label) {
          g += `<text x="${x}" y="${height - 4}" text-anchor="middle" font-size="10" fill="currentColor" class="note-label">${esc(it.label)}</text>`;
        }
        g += "</g>";
        out += g;
        break;
      }
      case "rest": {
        out += rest(it.dur, x, mid);
        for (let i = 0; i < (it.dots ?? 0); i++) {
          out += `<circle cx="${x + 10 + i * 5}" cy="${mid - G / 2}" r="1.7" fill="currentColor"/>`;
        }
        if (it.label) {
          out += `<text x="${x}" y="${height - 4}" text-anchor="middle" font-size="10" fill="currentColor">${esc(it.label)}</text>`;
        }
        break;
      }
      case "bar":
        out += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + 4 * G}" stroke="currentColor" stroke-width="1.2"/>`;
        break;
      case "end":
        out += `<line x1="${x - 3}" y1="${top}" x2="${x - 3}" y2="${top + 4 * G}" stroke="currentColor" stroke-width="1.2"/>`;
        out += `<line x1="${x + 2}" y1="${top}" x2="${x + 2}" y2="${top + 4 * G}" stroke="currentColor" stroke-width="3.5"/>`;
        break;
      case "time":
        out += `<text x="${x}" y="${top + 2 * G - 1.5}" text-anchor="middle" font-size="21" font-weight="700" font-family="Georgia, serif" fill="currentColor">${it.top}</text>`;
        out += `<text x="${x}" y="${top + 4 * G - 1.5}" text-anchor="middle" font-size="21" font-weight="700" font-family="Georgia, serif" fill="currentColor">${it.bottom}</text>`;
        break;
      case "text":
        out += `<text x="${x}" y="${it.y === undefined ? top + 4 * G + 16 : top + it.y}" font-size="${it.size ?? 11}" ${it.italic ? 'font-style="italic" font-family="Georgia, serif"' : ""} fill="currentColor">${esc(it.text)}</text>`;
        break;
    }
  }

  const label = opts.ariaLabel
    ? ` role="img" aria-label="${esc(opts.ariaLabel)}"`
    : ' aria-hidden="true"';
  return `<svg class="staff" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"${label}>${out}</svg>`;
}
