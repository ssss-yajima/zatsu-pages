// 「曲で読む」用の楽曲データ。すべてパブリックドメインの旋律
import {
  type Accidental,
  type Clef,
  LETTER_EN,
  type Letter,
  type Pitch,
  step,
} from "./notes";
import type { Dur, StaffItem } from "./staff";

export interface SongNote {
  pitch: Pitch;
  dur: Dur;
  dots: number;
}
export type SongEvent =
  | ({ kind: "note" } & SongNote)
  | { kind: "rest"; dur: Dur; dots: number }
  | { kind: "bar" };

export interface Song {
  id: string;
  title: string;
  sub: string;
  time: [number, number];
  /** 4分音符 = 1 拍としたテンポ（再生用） */
  bpm: number;
  events: SongEvent[];
  /** 音符の数（休符・小節線を除く） */
  noteCount: number;
}

/**
 * "C4q E4e. r4q |" のような簡易記法をパースする。
 * 音名 + オクターブ + 音価(w/h/q/e/s) + 付点(.)、r + 音価 で休符、| で小節線
 */
function parse(src: string): SongEvent[] {
  const out: SongEvent[] = [];
  for (const tok of src.trim().split(/\s+/)) {
    if (tok === "|") {
      out.push({ kind: "bar" });
      continue;
    }
    const rest = /^r([whqes])(\.?)$/.exec(tok);
    if (rest) {
      out.push({ kind: "rest", dur: rest[1] as Dur, dots: rest[2] ? 1 : 0 });
      continue;
    }
    const m = /^([A-G])([#b]?)(\d)([whqes])(\.?)$/.exec(tok);
    if (!m) {
      throw new Error(`楽曲データが不正: ${tok}`);
    }
    const letter = LETTER_EN.indexOf(
      m[1] as (typeof LETTER_EN)[number],
    ) as Letter;
    const acc: Accidental = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
    out.push({
      kind: "note",
      pitch: { letter, octave: Number(m[3]), acc },
      dur: m[4] as Dur,
      dots: m[5] ? 1 : 0,
    });
  }
  return out;
}

function song(
  id: string,
  title: string,
  sub: string,
  time: [number, number],
  bpm: number,
  src: string,
): Song {
  const events = parse(src);
  return {
    id,
    title,
    sub,
    time,
    bpm,
    events,
    noteCount: events.filter((e) => e.kind === "note").length,
  };
}

export const SONGS: Song[] = [
  song(
    "twinkle",
    "きらきら星",
    "ドから始まる、いちばんやさしい曲",
    [4, 4],
    100,
    `C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h |
     G4q G4q F4q F4q | E4q E4q D4h | G4q G4q F4q F4q | E4q E4q D4h |
     C4q C4q G4q G4q | A4q A4q G4h | F4q F4q E4q E4q | D4q D4q C4h`,
  ),
  song(
    "mary",
    "メリーさんのひつじ",
    "ド〜ソの5音だけ。4分音符中心",
    [4, 4],
    100,
    `E4q D4q C4q D4q | E4q E4q E4h | D4q D4q D4h | E4q G4q G4h |
     E4q D4q C4q D4q | E4q E4q E4q E4q | D4q D4q E4q D4q | C4w`,
  ),
  song(
    "frog",
    "かえるの合唱",
    "8分音符が出てくる。輪唱でおなじみ",
    [4, 4],
    96,
    `C4q D4q E4q F4q | E4q D4q C4h | E4q F4q G4q A4q | G4q F4q E4h |
     C4q C4q C4q C4q | C4e C4e D4e D4e E4e E4e F4e F4e | E4q D4q C4h`,
  ),
  song(
    "butterfly",
    "ちょうちょう",
    "2/4拍子。8分音符と4分音符の組み合わせ",
    [2, 4],
    92,
    `G4e E4e E4q | F4e D4e D4q | C4e D4e E4e F4e | G4e G4e G4q |
     G4e E4e E4q | F4e D4e D4q | C4e E4e G4e G4e | E4e E4e E4q |
     D4e D4e D4e D4e | D4e E4e F4q | E4e E4e E4e E4e | E4e F4e G4q |
     G4e E4e E4q | F4e D4e D4q | C4e E4e G4e G4e | E4e E4e E4q`,
  ),
  song(
    "london",
    "ロンドン橋",
    "付点4分音符が出てくる",
    [4, 4],
    100,
    `G4q. A4e G4q F4q | E4q F4q G4h | D4q E4q F4h | E4q F4q G4h |
     G4q. A4e G4q F4q | E4q F4q G4h | D4h G4h | E4h C4h`,
  ),
  song(
    "joy",
    "歓びの歌（ベートーヴェン）",
    "第九より。ミから始まる有名な旋律",
    [4, 4],
    96,
    `E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | E4q. D4e D4h |
     E4q E4q F4q G4q | G4q F4q E4q D4q | C4q C4q D4q E4q | D4q. C4e C4h`,
  ),
  song(
    "jingle",
    "ジングルベル（サビ）",
    "全音符・付点・8分音符が全部出る",
    [4, 4],
    112,
    `E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w |
     F4q F4q F4q. F4e | F4q E4q E4q E4e E4e | E4q D4q D4q E4q | D4h G4h |
     E4q E4q E4h | E4q E4q E4h | E4q G4q C4q. D4e | E4w |
     F4q F4q F4q. F4e | F4q E4q E4q E4e E4e | G4q G4q F4q D4q | C4w`,
  ),
  song(
    "birthday",
    "ハッピーバースデー",
    "3/4拍子。高いソまで使う、少し広い音域",
    [3, 4],
    100,
    `G4e G4e | A4q G4q C5q | B4h G4e G4e | A4q G4q D5q | C5h G4e G4e |
     G5q E5q C5q | B4q A4q F5e F5e | E5q C5q D5q | C5h`,
  ),
];

/** 音価を 4分音符 = 1 とした拍数に変換 */
export function beats(dur: Dur, dots: number): number {
  const base = { w: 4, h: 2, q: 1, e: 0.5, s: 0.25 }[dur];
  return dots ? base * 1.5 : base;
}

/** ヘ音記号で読むとき何オクターブ下げるか。高い曲は 2 オクターブ下げて五線に収める */
export function bassShift(song: Song): number {
  let maxStep = 0;
  for (const ev of song.events) {
    if (ev.kind === "note") {
      maxStep = Math.max(maxStep, step(ev.pitch));
    }
  }
  return maxStep <= step({ letter: 6, octave: 4, acc: 0 }) ? 1 : 2;
}

/** ヘ音記号で読むときはオクターブを下げる */
export function transposeFor(p: Pitch, clef: Clef, shift = 1): Pitch {
  return clef === "bass" ? { ...p, octave: p.octave - shift } : p;
}

/** 表示用の段（システム）に分割する。小節単位で切り、1 段あたりの拍数を目安にする */
export function splitSystems(
  song: Song,
  beatsPerSystem: number,
): SongEvent[][] {
  const systems: SongEvent[][] = [];
  let cur: SongEvent[] = [];
  let curBeats = 0;
  let measure: SongEvent[] = [];
  let measureBeats = 0;
  const flushMeasure = (): void => {
    if (measure.length === 0) {
      return;
    }
    if (cur.length > 0 && curBeats + measureBeats > beatsPerSystem) {
      systems.push(cur);
      cur = [];
      curBeats = 0;
    }
    cur.push(...measure);
    curBeats += measureBeats;
    measure = [];
    measureBeats = 0;
  };
  for (const ev of song.events) {
    if (ev.kind === "bar") {
      measure.push(ev);
      flushMeasure();
    } else {
      measure.push(ev);
      measureBeats += beats(ev.dur, ev.dots);
    }
  }
  flushMeasure();
  if (cur.length) {
    systems.push(cur);
  }
  return systems;
}

/** システムの StaffItem 列を作る。noteIndex は曲全体での音符番号 */
export function toItems(
  events: SongEvent[],
  clef: Clef,
  firstNoteIndex: number,
  currentIndex: number,
  flashNg: boolean,
  shift: number,
): StaffItem[] {
  let idx = firstNoteIndex;
  const items: StaffItem[] = [];
  for (const ev of events) {
    if (ev.kind === "bar") {
      items.push({ kind: "bar" });
    } else if (ev.kind === "rest") {
      items.push({ kind: "rest", dur: ev.dur, dots: ev.dots });
    } else {
      const cls =
        idx < currentIndex
          ? "done"
          : idx === currentIndex
            ? flashNg
              ? "current ng"
              : "current"
            : "";
      items.push({
        kind: "note",
        pitch: transposeFor(ev.pitch, clef, shift),
        dur: ev.dur,
        dots: ev.dots,
        cls,
      });
      idx++;
    }
  }
  return items;
}
