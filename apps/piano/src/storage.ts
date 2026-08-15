// 保存データ。GitHub Pages では全アプリが localStorage を共有するため "piano:" プレフィックス必須
const PREFIX = "piano:";

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // 保存できない環境でも続行する
  }
}

// ---- 音符クイズの成績 ----
export interface QuizResult {
  /** レベル ID */
  level: string;
  /** 正解数 / 出題数 */
  correct: number;
  total: number;
  /** 1 問あたりの平均秒 */
  avgSec: number;
  /** ISO 日時 */
  at: string;
}

export const getQuizResults = (): QuizResult[] =>
  load<QuizResult[]>("quiz", []).filter(
    (r) => typeof r.total === "number" && r.total > 0,
  );

export function addQuizResult(r: QuizResult): void {
  const list = getQuizResults();
  list.unshift(r);
  save("quiz", list.slice(0, 200));
}

// ---- 曲で読む の成績 ----
export interface SongResult {
  song: string;
  clef: "treble" | "bass";
  mistakes: number;
  /** かかった秒数 */
  sec: number;
  at: string;
}

export const getSongResults = (): SongResult[] =>
  load<SongResult[]>("songs", []).filter((r) => typeof r.sec === "number");

export function addSongResult(r: SongResult): void {
  const list = getSongResults();
  list.unshift(r);
  save("songs", list.slice(0, 200));
}

// ---- 練習ドリルの成績 ----
export interface DrillResult {
  drill: string;
  correct: number;
  total: number;
  at: string;
}

export const getDrillResults = (): DrillResult[] =>
  load<DrillResult[]>("drills", []).filter(
    (r) => typeof r.total === "number" && r.total > 0,
  );

export function addDrillResult(r: DrillResult): void {
  const list = getDrillResults();
  list.unshift(r);
  save("drills", list.slice(0, 200));
}

// ---- レッスンの進捗 ----
export interface LessonProgress {
  /** 読了した */
  read: boolean;
  /** 確認クイズの最高正解数 */
  best: number;
  total: number;
}

export const getLessonProgress = (): Record<string, LessonProgress> =>
  load<Record<string, LessonProgress>>("lessons", {});

export function setLessonProgress(
  id: string,
  p: Partial<LessonProgress>,
): void {
  const all = getLessonProgress();
  const cur = all[id] ?? { read: false, best: 0, total: 0 };
  all[id] = { ...cur, ...p };
  save("lessons", all);
}

// ---- 練習記録 ----
export interface PracticeEntry {
  id: string;
  /** YYYY-MM-DD（ローカル日付） */
  date: string;
  minutes: number;
  /** 練習内容のタグ */
  tags: string[];
  memo: string;
}

export const getPractice = (): PracticeEntry[] =>
  load<PracticeEntry[]>("practice", []).filter(
    (e) => typeof e.date === "string" && typeof e.minutes === "number",
  );

export function addPractice(e: PracticeEntry): void {
  const list = getPractice();
  list.unshift(e);
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  save("practice", list);
}

export function removePractice(id: string): void {
  save(
    "practice",
    getPractice().filter((e) => e.id !== id),
  );
}

// ---- 設定 ----
export interface Settings {
  sound: boolean;
  /** 音名表記: ja=ドレミ en=CDE */
  noteNames: "ja" | "en";
  /** 曲で読むときの音部記号 */
  songClef: "treble" | "bass";
}

export const getSettings = (): Settings => ({
  sound: true,
  noteNames: "ja",
  songClef: "treble",
  ...load<Partial<Settings>>("settings", {}),
});

export const saveSettings = (s: Settings): void => save("settings", s);

/** ローカル日付を YYYY-MM-DD にする */
export function localDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
