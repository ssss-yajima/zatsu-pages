// 記録と設定の保存
// GitHub Pages は同一オリジンで全アプリが localStorage を共有するため、
// キーには必ず "keisan:" プレフィックスを付ける（AGENTS.md の規約）
const PREFIX = "keisan:";

export interface PlayRecord {
  /** タイム（ミリ秒） */
  t: number;
  /** まちがい回数 */
  m: number;
  /** 日付（ISO 文字列） */
  d: string;
}

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
    // プライベートブラウズ等で保存できなくても続行する
  }
}

function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // 何もしない
  }
}

/** 記録（新しい順、最大50件） */
export function getRecords(id: string): PlayRecord[] {
  return load<PlayRecord[]>(`records:${id}`, []);
}

export function addRecord(id: string, rec: PlayRecord): void {
  const list = getRecords(id);
  list.unshift(rec);
  const kept = list.slice(0, 50);
  // 50件で切り捨てるとき、ベスト記録だけは落とさない（「いちばん はやい」が悪化して見えるのを防ぐ）
  const best = list.reduce((a, b) => (b.t < a.t ? b : a));
  if (!kept.includes(best)) {
    kept.push(best);
  }
  save(`records:${id}`, kept);
}

export function clearRecords(id: string): void {
  removeItem(`records:${id}`);
}

export function bestOf(list: PlayRecord[]): number | null {
  return list.length ? Math.min(...list.map((r) => r.t)) : null;
}

export const loadSoundOn = (): boolean => load("sound", true);
export const saveSoundOn = (on: boolean): void => save("sound", on);
