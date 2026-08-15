import "./style.css";
import {
  isSoundOn,
  playFreq,
  setSoundOn,
  sndDone,
  sndNg,
  sndOk,
} from "./audio";
import { DRILL_COUNT, DRILLS, type Drill, makeDrill } from "./drills";
import {
  LESSONS,
  type Lesson,
  type Question as LessonQuestion,
} from "./lessons";
import {
  ACC_SYMBOL,
  type Clef,
  enharmonic,
  freq,
  fromStep,
  LETTER_EN,
  LETTER_JA,
  nameEn,
  nameJa,
  type Pitch,
  pitchClass,
  step,
} from "./notes";
import {
  LEVELS,
  type Level,
  makeQuestion,
  QUESTIONS_PER_SET,
  type Question,
} from "./quiz";
import {
  bassShift,
  beats,
  SONGS,
  type Song,
  splitSystems,
  toItems,
  transposeFor,
} from "./songs";
import { staffSvg } from "./staff";
import {
  addDrillResult,
  addPractice,
  addQuizResult,
  addSongResult,
  getDrillResults,
  getLessonProgress,
  getPractice,
  getQuizResults,
  getSettings,
  getSongResults,
  localDate,
  type PracticeEntry,
  removePractice,
  type Settings,
  saveSettings,
  setLessonProgress,
} from "./storage";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app が見つかりません");
}
const app: HTMLDivElement = root;

let settings: Settings = getSettings();
setSoundOn(settings.sound);

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const $ = <T extends Element>(sel: string, from: ParentNode = app): T => {
  const el = from.querySelector<T>(sel);
  if (!el) {
    throw new Error(`${sel} が見つかりません`);
  }
  return el;
};
const $$ = <T extends Element>(sel: string, from: ParentNode = app): T[] =>
  Array.from(from.querySelectorAll<T>(sel));

/** 音名（設定に応じて ドレミ / CDE） */
const noteName = (p: Pitch): string =>
  settings.noteNames === "ja" ? nameJa(p) : nameEn(p).replace(/\d+$/, "");

/** 正解表示用: 「ソ♯（ラ♭）」のように異名同音も添える */
function fullName(p: Pitch): string {
  const e = enharmonic(p);
  return e ? `${noteName(p)}（${noteName(e)}）` : noteName(p);
}

// ---------------------------------------------------------------------------
// ルーティング
// ---------------------------------------------------------------------------
type Tab = "quiz" | "learn" | "log";

function route(): void {
  const hash = location.hash.replace(/^#\/?/, "");
  const [tab, sub] = hash.split("/");
  // "#song/<id>" は おんぷタブ配下の画面
  const t: Tab = tab === "learn" || tab === "log" ? tab : "quiz";
  renderShell(t);
  const view = $<HTMLElement>("#view");
  if (t === "quiz") {
    const level = LEVELS.find((l) => l.id === sub);
    const song = tab === "song" ? SONGS.find((sg) => sg.id === sub) : undefined;
    if (song) {
      renderSongRun(view, song);
    } else if (level) {
      renderQuizRun(view, level);
    } else {
      renderQuizHome(view);
    }
  } else if (t === "learn") {
    const lesson = LESSONS.find((l) => l.id === sub);
    if (sub === "drill") {
      renderDrill(
        view,
        DRILLS.find((d) => d.id === hash.split("/")[2]) ?? DRILLS[0],
      );
    } else if (lesson) {
      renderLesson(view, lesson);
    } else {
      renderLearnHome(view);
    }
  } else {
    renderLog(view);
  }
  window.scrollTo(0, 0);
}

let shellTab: Tab | null = null;
function renderShell(tab: Tab): void {
  if (shellTab === null) {
    app.innerHTML = `
      <header class="top">
        <h1><span aria-hidden="true">🎹</span> ピアノのきほん</h1>
        <button type="button" class="icon-btn" id="sound-btn" aria-label="効果音の切り替え"></button>
      </header>
      <main id="view"></main>
      <nav class="tabs" aria-label="メニュー">
        <a href="#quiz" data-tab="quiz"><span class="tab-icon">🎼</span>おんぷ</a>
        <a href="#learn" data-tab="learn"><span class="tab-icon">📖</span>まなぶ</a>
        <a href="#log" data-tab="log"><span class="tab-icon">📝</span>きろく</a>
      </nav>`;
    $<HTMLButtonElement>("#sound-btn").addEventListener("click", () => {
      settings = { ...settings, sound: !settings.sound };
      setSoundOn(settings.sound);
      saveSettings(settings);
      updateSoundBtn();
    });
    updateSoundBtn();
  }
  shellTab = tab;
  for (const a of $$<HTMLAnchorElement>(".tabs a")) {
    a.classList.toggle("active", a.dataset.tab === tab);
    a.setAttribute("aria-current", a.dataset.tab === tab ? "page" : "false");
  }
}

function updateSoundBtn(): void {
  const b = $<HTMLButtonElement>("#sound-btn");
  b.textContent = isSoundOn() ? "🔊" : "🔇";
  b.title = isSoundOn() ? "音: オン" : "音: オフ";
}

// ---------------------------------------------------------------------------
// おんぷクイズ: レベル選択
// ---------------------------------------------------------------------------
function renderQuizHome(view: HTMLElement): void {
  const results = getQuizResults();
  const cards = LEVELS.map((lv) => {
    const rs = results.filter(
      (r) => r.level === resultKey(lv.id, settings.quizNotes),
    );
    const last = rs[0];
    const best = rs.reduce((m, r) => Math.max(m, r.correct / r.total), 0);
    // プレビューは出題範囲の真ん中あたりの音を出す
    const [lo, hi] = lv.range[lv.clefs[0]];
    const mid = fromStep(
      Math.round((step(lo) + step(hi)) / 2),
      lv.accidentals ? 1 : 0,
    );
    const preview = staffSvg({
      clef: lv.clefs[0],
      items: [{ kind: "note", pitch: mid }],
      padTop: 25,
      padBottom: 25,
      minWidth: 90,
    });
    const stat = last
      ? `<span class="muted">前回 ${last.correct}/${last.total} · ${last.avgSec.toFixed(1)}秒/問</span>${best >= 0.9 ? ' <span class="badge">★ 9割達成</span>' : ""}`
      : `<span class="muted">まだ挑戦していません</span>`;
    return `
      <a class="card level" href="#quiz/${lv.id}">
        <div class="level-preview">${preview}</div>
        <div class="level-body">
          <div class="level-title">${esc(lv.title)}</div>
          <div class="level-desc">${esc(lv.desc)}</div>
          <div class="level-stat">${stat}</div>
        </div>
        <div class="chev" aria-hidden="true">›</div>
      </a>`;
  }).join("");

  const songResults = getSongResults();
  const songCards = SONGS.map((sg) => {
    const rs = songResults.filter((r) => r.song === sg.id);
    const best = rs.reduce<(typeof rs)[number] | null>(
      (m, r) =>
        m === null ||
        r.mistakes < m.mistakes ||
        (r.mistakes === m.mistakes && r.sec < m.sec)
          ? r
          : m,
      null,
    );
    const stat = best
      ? `<span class="muted">ベスト ミス${best.mistakes} · ${Math.round(best.sec)}秒</span>${best.mistakes === 0 ? ' <span class="badge">★ ノーミス</span>' : ""}`
      : `<span class="muted">${sg.noteCount}音 · ${sg.time[0]}/${sg.time[1]}拍子</span>`;
    return `
      <a class="card level" href="#song/${sg.id}">
        <div class="lesson-emoji" aria-hidden="true">🎶</div>
        <div class="level-body">
          <div class="level-title">${esc(sg.title)}</div>
          <div class="level-desc">${esc(sg.sub)}</div>
          <div class="level-stat">${stat}</div>
        </div>
        <div class="chev" aria-hidden="true">›</div>
      </a>`;
  }).join("");

  view.innerHTML = `
    <section class="intro">
      <h2>おんぷ読みクイズ</h2>
      <p>五線の音符を見て、鍵盤で答えます。1セット ${QUESTIONS_PER_SET} 問。まずは上から順に、9割正解できたら次のレベルへ。</p>
      <div class="row tight">
        <div class="seg" role="group" aria-label="1問の音符数">
          <button type="button" data-notes="1" class="${settings.quizNotes === 1 ? "on" : ""}">1音ずつ</button>
          <button type="button" data-notes="3" class="${settings.quizNotes === 3 ? "on" : ""}">3音つづけて</button>
        </div>
        <div class="seg" role="group" aria-label="音名の表記">
          <button type="button" data-names="ja" class="${settings.noteNames === "ja" ? "on" : ""}">ドレミ</button>
          <button type="button" data-names="en" class="${settings.noteNames === "en" ? "on" : ""}">CDE</button>
        </div>
      </div>
      <p class="muted small">${settings.quizNotes === 3 ? "3つの音符を左から順に読みます。1音正解するとすぐ次の音へ" : "1音ずつ表示。正解すると次の問題へ"}</p>
    </section>
    <div class="list">${cards}</div>
    <section class="intro song-intro">
      <h2>曲で読む</h2>
      <p>知っている曲の楽譜を、先頭から1音ずつ鍵盤で読み進めます。リズム・小節・付点も本物の譜面のまま。読めた音は色が薄くなり、今の音が濃く光ります。</p>
    </section>
    <div class="list">${songCards}</div>`;

  for (const b of $$<HTMLButtonElement>("[data-notes]", view)) {
    b.addEventListener("click", () => {
      settings = { ...settings, quizNotes: b.dataset.notes === "3" ? 3 : 1 };
      saveSettings(settings);
      renderQuizHome(view);
    });
  }
  for (const b of $$<HTMLButtonElement>("[data-names]", view)) {
    b.addEventListener("click", () => {
      settings = {
        ...settings,
        noteNames: b.dataset.names === "en" ? "en" : "ja",
      };
      saveSettings(settings);
      renderQuizHome(view);
    });
  }
}

// ---------------------------------------------------------------------------
// おんぷクイズ: 出題
// ---------------------------------------------------------------------------
const WHITE_PC = [0, 2, 4, 5, 7, 9, 11];
const BLACK = [
  { pc: 1, after: 0 },
  { pc: 3, after: 1 },
  { pc: 6, after: 3 },
  { pc: 8, after: 4 },
  { pc: 10, after: 5 },
];

function keyboardHtml(): string {
  const whites = WHITE_PC.map((pc, i) => {
    const label = settings.noteNames === "ja" ? LETTER_JA[i] : LETTER_EN[i];
    return `<button type="button" class="key white" data-pc="${pc}" aria-label="${label}"><span>${label}</span></button>`;
  }).join("");
  const blacks = BLACK.map(({ pc, after }) => {
    const sharpName =
      settings.noteNames === "ja" ? LETTER_JA[after] : LETTER_EN[after];
    const flatName =
      settings.noteNames === "ja" ? LETTER_JA[after + 1] : LETTER_EN[after + 1];
    const left = ((after + 1) * 100) / 7;
    return `<button type="button" class="key black" data-pc="${pc}" style="left:${left}%" aria-label="${sharpName}${ACC_SYMBOL[1]}"><span>${sharpName}${ACC_SYMBOL[1]}<br>${flatName}${ACC_SYMBOL[-1]}</span></button>`;
  }).join("");
  return `<div class="keyboard" role="group" aria-label="鍵盤で答える">${whites}${blacks}</div>`;
}

function renderQuizRun(view: HTMLElement, level: Level): void {
  /** 1 問あたりの音符数（1 or 3）。3 音モードは左から順に答える */
  const perQ = settings.quizNotes;
  const clefFor = (): Clef =>
    level.clefs[Math.floor(Math.random() * level.clefs.length)];
  /** 同じ音部記号で perQ 個の音を作る */
  const makeGroup = (prev?: Question): Question[] => {
    const clef = clefFor();
    const one = { ...level, clefs: [clef] };
    const out: Question[] = [];
    for (let i = 0; i < perQ; i++) {
      out.push(makeQuestion(one, out[i - 1] ?? prev));
    }
    return out;
  };

  let index = 0;
  let noteIdx = 0;
  let correct = 0;
  const times: number[] = [];
  const mistakes: { q: Question; answered: number }[] = [];
  let group: Question[] = makeGroup();
  let askedAt = 0;
  let locked = false;
  /** この音で一度でも間違えたか（正解数は「一発正解」で数える） */
  let missedThis = false;
  const totalNotes = QUESTIONS_PER_SET * perQ;

  view.innerHTML = `
    <section class="quiz">
      <div class="quiz-head">
        <a href="#quiz" class="back">‹ レベル一覧</a>
        <div class="quiz-title">${esc(level.title)}${perQ > 1 ? ` <span class="badge">${perQ}音</span>` : ""}</div>
        <div class="progress" aria-label="進捗"><div class="bar" id="bar"></div></div>
        <div class="counter" id="counter"></div>
      </div>
      <div class="staff-box ${perQ > 1 ? "wide" : ""}" id="staff-box"></div>
      ${keyboardHtml()}
    </section>`;

  const staffBox = $<HTMLElement>("#staff-box", view);
  const keys = $$<HTMLButtonElement>(".key", view);
  const current = (): Question => group[noteIdx];

  const drawStaff = (): void => {
    staffBox.innerHTML = staffSvg({
      clef: group[0].clef,
      items: group.map((q, i) => ({
        kind: "note" as const,
        pitch: q.pitch,
        cls: i < noteIdx ? "done" : i === noteIdx && perQ > 1 ? "current" : "q",
      })),
      padTop: 40,
      padBottom: 40,
      minWidth: perQ > 1 ? 190 : 150,
      ariaLabel: "問題の音符",
    });
  };
  const updateHead = (): void => {
    const done = index * perQ + noteIdx;
    $<HTMLElement>("#bar", view).style.width = `${(done / totalNotes) * 100}%`;
    $<HTMLElement>("#counter", view).textContent =
      `${index + 1} / ${QUESTIONS_PER_SET}`;
  };

  const showQuestion = (): void => {
    locked = false;
    for (const k of keys) {
      k.classList.remove("ok", "ng");
    }
    missedThis = false;
    drawStaff();
    updateHead();
    askedAt = performance.now();
  };

  const advance = (): void => {
    index++;
    noteIdx = 0;
    if (index >= QUESTIONS_PER_SET) {
      finish();
      return;
    }
    group = makeGroup(group[group.length - 1]);
    showQuestion();
  };

  // 正解したら少し待って次へ。間違えたら止まり、正解を押すまで進まない
  const ADVANCE_MS = 520;
  const answer = (pc: number, key: HTMLButtonElement): void => {
    if (locked) {
      return;
    }
    const q = current();
    const ok = pc === pitchClass(q.pitch);
    const note = $$<SVGElement>(".note", staffBox)[noteIdx];
    if (ok) {
      times.push((performance.now() - askedAt) / 1000);
      if (!missedThis) {
        correct++;
      }
      playFreq(freq(q.pitch));
      for (const k of keys) {
        k.classList.remove("ng", "ok");
      }
      key.classList.add("ok");
      note.classList.remove("ng");
      note.classList.add("ok");
      sndOk();
      // 緑は短く光らせるだけ（次の音に移っても残さない）
      window.setTimeout(() => {
        key.classList.remove("ok");
      }, 300);
      if (noteIdx + 1 < perQ) {
        // 3 音モード: 待たずに次の音へ
        noteIdx++;
        missedThis = false;
        askedAt = performance.now();
        drawStaff();
        updateHead();
        return;
      }
      locked = true;
      window.setTimeout(advance, ADVANCE_MS);
    } else {
      if (!missedThis) {
        mistakes.push({ q, answered: pc });
      }
      missedThis = true;
      // 押した鍵盤だけ短く赤く光らせる。正解は教えず、当たるまで探させる
      for (const k of keys) {
        k.classList.remove("ng");
      }
      key.classList.add("ng");
      note.classList.add("ng");
      sndNg();
      window.setTimeout(() => {
        key.classList.remove("ng");
        note.classList.remove("ng");
      }, 350);
    }
  };

  const finish = (): void => {
    const avg = times.reduce((a, b) => a + b, 0) / Math.max(1, times.length);
    addQuizResult({
      level: resultKey(level.id, perQ),
      correct,
      total: totalNotes,
      avgSec: Math.round(avg * 10) / 10,
      at: new Date().toISOString(),
    });
    sndDone();
    const rate = correct / totalNotes;
    const msg =
      rate === 1
        ? "パーフェクト！次のレベルへ進みましょう"
        : rate >= 0.9
          ? "よくできました。次のレベルにも挑戦を"
          : rate >= 0.7
            ? "あと少し。同じレベルをもう一度"
            : "間違えた音を「まなぶ」で確認してから、もう一度";
    const wrongList = mistakes.length
      ? `<h3>つまずいた音</h3><div class="mistakes">${mistakes
          .map(
            ({ q }) =>
              `<div class="mistake">${staffSvg({ clef: q.clef, items: [{ kind: "note", pitch: q.pitch, label: fullName(q.pitch) }], minWidth: 90 })}</div>`,
          )
          .join("")}</div>`
      : "";
    view.innerHTML = `
      <section class="result">
        <h2>けっか</h2>
        <div class="score"><span class="big">${correct}</span> / ${totalNotes} <span class="muted">一発正解</span></div>
        <p class="muted">平均 ${avg.toFixed(1)} 秒/音</p>
        <p class="msg">${msg}</p>
        ${wrongList}
        <div class="row">
          <a class="btn primary" href="#quiz/${level.id}" id="retry">もう一回</a>
          <a class="btn" href="#quiz">レベル一覧へ</a>
        </div>
      </section>`;
    $<HTMLAnchorElement>("#retry", view).addEventListener("click", (e) => {
      // 同じハッシュなので hashchange が起きない。手動で再描画
      e.preventDefault();
      renderQuizRun(view, level);
    });
  };

  for (const k of keys) {
    k.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      answer(Number(k.dataset.pc), k);
    });
  }

  showQuestion();
}

/** 成績の保存キー。3 音モードは別枠で記録する */
const resultKey = (levelId: string, perQ: number): string =>
  perQ > 1 ? `${levelId}:${perQ}` : levelId;

// ---------------------------------------------------------------------------
// 曲で読む
// ---------------------------------------------------------------------------
function renderSongRun(view: HTMLElement, song: Song): void {
  const clef = settings.songClef;
  const shift = bassShift(song);
  const systems = splitSystems(song, song.time[0] === 2 ? 8 : 12);
  // 各段の先頭の音符番号
  const firstIdx: number[] = [];
  let acc = 0;
  for (const sys of systems) {
    firstIdx.push(acc);
    acc += sys.filter((e) => e.kind === "note").length;
  }
  const notes = song.events.filter((e) => e.kind === "note");
  let index = 0;
  let mistakes = 0;
  let flashNg = false;
  let startedAt = 0;
  let playing = false;
  let done = false;

  view.innerHTML = `
    <section class="song">
      <div class="quiz-head">
        <a href="#quiz" class="back">‹ 一覧にもどる</a>
        <div class="quiz-title">${esc(song.title)}</div>
        <div class="progress" aria-label="進捗"><div class="bar" id="bar"></div></div>
        <div class="counter" id="counter"></div>
      </div>
      <div class="row tight song-tools">
        <div class="seg" role="group" aria-label="音部記号">
          <button type="button" data-clef="treble" class="${clef === "treble" ? "on" : ""}">ト音記号（右手）</button>
          <button type="button" data-clef="bass" class="${clef === "bass" ? "on" : ""}">ヘ音記号（左手）</button>
        </div>
        <button type="button" class="btn small" id="play-btn">▶ きいてみる</button>
      </div>
      <div class="sheet" id="sheet"></div>
      <div class="feedback" id="feedback" aria-live="polite">&nbsp;</div>
      ${keyboardHtml()}
    </section>`;

  const sheet = $<HTMLElement>("#sheet", view);
  const feedback = $<HTMLElement>("#feedback", view);
  const keys = $$<HTMLButtonElement>(".key", view);

  const drawSystem = (i: number, minWidth = systemWidth): string =>
    staffSvg({
      clef,
      minWidth,
      items: [
        ...(i === 0
          ? [{ kind: "time" as const, top: song.time[0], bottom: song.time[1] }]
          : []),
        ...toItems(systems[i], clef, firstIdx[i], index, flashNg, shift),
        ...(i === systems.length - 1 ? [{ kind: "end" as const }] : []),
      ],
    });
  // 段ごとの幅をそろえる（短い最終段が拡大表示されないように、いちばん広い段に合わせる）
  const systemWidth = systems.reduce((w, _, i) => {
    const m = /viewBox="0 0 (\d+(?:\.\d+)?)/.exec(drawSystem(i, 0));
    return Math.max(w, m ? Number(m[1]) : 0);
  }, 0);

  const systemOf = (noteIndex: number): number => {
    let s = 0;
    for (let i = 0; i < firstIdx.length; i++) {
      if (firstIdx[i] <= noteIndex) {
        s = i;
      }
    }
    return s;
  };

  const updateHead = (): void => {
    $<HTMLElement>("#bar", view).style.width =
      `${(index / notes.length) * 100}%`;
    $<HTMLElement>("#counter", view).textContent =
      `${Math.min(index + 1, notes.length)} / ${notes.length}`;
  };
  const drawAll = (): void => {
    sheet.innerHTML = systems
      .map((_, i) => `<div class="system" data-i="${i}">${drawSystem(i)}</div>`)
      .join("");
    updateHead();
  };
  const redrawSystem = (i: number): void => {
    const el = sheet.querySelector<HTMLElement>(`.system[data-i="${i}"]`);
    if (el) {
      el.innerHTML = drawSystem(i);
    }
  };
  const scrollToCurrent = (): void => {
    const el = sheet.querySelector<HTMLElement>(
      `.system[data-i="${systemOf(index)}"]`,
    );
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const currentPitch = (): Pitch => {
    const ev = notes[index];
    return ev.kind === "note"
      ? transposeFor(ev.pitch, clef, shift)
      : { letter: 0, octave: 4, acc: 0 };
  };

  const finish = (): void => {
    done = true;
    const sec = (performance.now() - startedAt) / 1000;
    addSongResult({
      song: song.id,
      clef,
      mistakes,
      sec,
      at: new Date().toISOString(),
    });
    sndDone();
    const msg =
      mistakes === 0
        ? "ノーミス！つぎの曲や、ヘ音記号でも挑戦してみましょう"
        : mistakes <= 3
          ? "ほぼ読めています。もう一回で定着させましょう"
          : "止まった音は「おんぷ読みクイズ」で個別に練習すると速くなります";
    feedback.className = "feedback good";
    feedback.innerHTML = `<b>完走！</b> ミス ${mistakes} 回 · ${Math.round(sec)} 秒`;
    const kb = $<HTMLElement>(".keyboard", view);
    kb.insertAdjacentHTML(
      "afterend",
      `<div class="result inline"><p class="msg">${msg}</p><div class="row"><a class="btn primary" href="#song/${song.id}" id="retry">もう一回</a><a class="btn" href="#quiz">一覧へ</a></div></div>`,
    );
    kb.hidden = true;
    $<HTMLAnchorElement>("#retry", view).addEventListener("click", (e) => {
      e.preventDefault();
      renderSongRun(view, song);
    });
  };

  const answer = (pc: number): void => {
    if (done || playing) {
      return;
    }
    if (index === 0 && startedAt === 0) {
      startedAt = performance.now();
    }
    const p = currentPitch();
    if (pc === pitchClass(p)) {
      playFreq(freq(p), 0.8);
      const prevSys = systemOf(index);
      index++;
      flashNg = false;
      if (index >= notes.length) {
        redrawSystem(prevSys);
        updateHead();
        finish();
        return;
      }
      const nextSys = systemOf(index);
      redrawSystem(prevSys);
      if (nextSys !== prevSys) {
        redrawSystem(nextSys);
        scrollToCurrent();
      }
      updateHead();
    } else {
      mistakes++;
      flashNg = true;
      sndNg();
      redrawSystem(systemOf(index));
      window.setTimeout(() => {
        if (flashNg && !done) {
          flashNg = false;
          redrawSystem(systemOf(index));
        }
      }, 450);
    }
  };

  for (const k of keys) {
    k.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      answer(Number(k.dataset.pc));
    });
  }
  for (const b of $$<HTMLButtonElement>("[data-clef]", view)) {
    b.addEventListener("click", () => {
      settings = {
        ...settings,
        songClef: b.dataset.clef === "bass" ? "bass" : "treble",
      };
      saveSettings(settings);
      renderSongRun(view, song);
    });
  }
  // 再生: リズムどおりに全体を鳴らす
  $<HTMLButtonElement>("#play-btn", view).addEventListener("click", () => {
    if (playing) {
      return;
    }
    playing = true;
    const spb = 60 / song.bpm;
    let t = 0.05;
    for (const ev of song.events) {
      if (ev.kind === "bar") {
        continue;
      }
      const len = beats(ev.dur, ev.dots) * spb;
      if (ev.kind === "note") {
        playFreq(
          freq(transposeFor(ev.pitch, clef, shift)),
          Math.min(1.2, len * 0.95),
          t,
        );
      }
      t += len;
    }
    window.setTimeout(() => {
      playing = false;
    }, t * 1000);
  });

  drawAll();
}

// ---------------------------------------------------------------------------
// まなぶ
// ---------------------------------------------------------------------------
function renderLearnHome(view: HTMLElement): void {
  const prog = getLessonProgress();
  const cards = LESSONS.map((l, i) => {
    const p = prog[l.id];
    const status = p?.read
      ? p.total > 0
        ? `<span class="badge ${p.best === p.total ? "gold" : ""}">確認クイズ ${p.best}/${p.total}</span>`
        : `<span class="badge">読了</span>`
      : `<span class="muted">未読</span>`;
    return `
      <a class="card lesson-card" href="#learn/${l.id}">
        <div class="lesson-emoji" aria-hidden="true">${l.emoji}</div>
        <div class="level-body">
          <div class="level-title">${i + 1}. ${esc(l.title)}</div>
          <div class="level-desc">${esc(l.lead)}</div>
          <div class="level-stat">${status}</div>
        </div>
        <div class="chev" aria-hidden="true">›</div>
      </a>`;
  }).join("");
  const drillResults = getDrillResults();
  const drillCards = DRILLS.map((d) => {
    const rs = drillResults.filter((r) => r.drill === d.id);
    const last = rs[0];
    const best = rs.reduce((m, r) => Math.max(m, r.correct), 0);
    const stat = last
      ? `<span class="muted">前回 ${last.correct}/${last.total} · ベスト ${best}/${last.total}</span>${best === last.total ? ' <span class="badge gold">★ 満点</span>' : ""}`
      : `<span class="muted">まだ挑戦していません</span>`;
    return `
      <a class="card lesson-card" href="#learn/drill/${d.id}">
        <div class="lesson-emoji" aria-hidden="true">${d.id === "mix" ? "🎲" : "✏️"}</div>
        <div class="level-body">
          <div class="level-title">${esc(d.title)}</div>
          <div class="level-desc">${esc(d.desc)}</div>
          <div class="level-stat">${stat}</div>
        </div>
        <div class="chev" aria-hidden="true">›</div>
      </a>`;
  }).join("");
  view.innerHTML = `
    <a class="card textbook-card" href="./textbook.html">
      <div class="lesson-emoji" aria-hidden="true">📘</div>
      <div class="level-body">
        <div class="level-title">練習の教科書（6か月の進め方）</div>
        <div class="level-desc">姿勢・指使い・練習の設計を段階的に。手元の教本と一緒に読む長めのテキスト</div>
        <div class="level-stat"><span class="muted">別ページで開きます</span></div>
      </div>
      <div class="chev" aria-hidden="true">›</div>
    </a>
    <section class="intro">
      <h2>楽譜の読み方・きそ知識</h2>
      <p>1つ5分ほどで読める短いレッスン。各レッスンの最後に確認クイズがあります。順番に読むのがおすすめです。</p>
    </section>
    <div class="list">${cards}</div>
    <section class="intro song-intro">
      <h2>練習ドリル</h2>
      <p>毎回ちがう問題がランダムに出る ${DRILL_COUNT} 問セット。レッスンを読んだあとの定着に。</p>
    </section>
    <div class="list">${drillCards}</div>`;
}

function renderLesson(view: HTMLElement, lesson: Lesson): void {
  const idx = LESSONS.indexOf(lesson);
  const next = LESSONS[idx + 1];
  const sections = lesson.sections
    .map((s) => {
      let h = '<section class="lesson-sec">';
      if (s.h) {
        h += `<h3>${esc(s.h)}</h3>`;
      }
      if (s.p) {
        h += `<p>${s.p}</p>`;
      }
      if (s.svg) {
        h += `<div class="fig">${s.svg}</div>`;
      }
      if (s.table) {
        const [head, ...rows] = s.table;
        h += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows
          .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`;
      }
      if (s.tip) {
        h += `<div class="tip">💡 ${s.tip}</div>`;
      }
      return `${h}</section>`;
    })
    .join("");

  view.innerHTML = `
    <article class="lesson">
      <a href="#learn" class="back">‹ レッスン一覧</a>
      <h2><span aria-hidden="true">${lesson.emoji}</span> ${esc(lesson.title)}</h2>
      <p class="lead">${esc(lesson.lead)}</p>
      ${sections}
      <section class="check" id="check">
        <h3>確認クイズ（${lesson.quiz.length}問）</h3>
        <div id="check-body"></div>
      </section>
      <div class="row lesson-nav">
        <a class="btn" href="#learn">一覧へ</a>
        ${next ? `<a class="btn primary" href="#learn/${next.id}">次: ${esc(next.title)} ›</a>` : `<a class="btn primary" href="#learn/drill/mix">練習ドリルへ ›</a>`}
      </div>
    </article>`;
  setLessonProgress(lesson.id, { read: true });
  renderLessonCheck($<HTMLElement>("#check-body", view), lesson);
}

function renderLessonCheck(box: HTMLElement, lesson: Lesson): void {
  runQuestions(box, lesson.quiz, (score) => {
    const prev = getLessonProgress()[lesson.id];
    setLessonProgress(lesson.id, {
      best: Math.max(prev?.best ?? 0, score),
      total: lesson.quiz.length,
    });
    return score === lesson.quiz.length
      ? "全問正解！"
      : "間違えたところを読み返してもう一度どうぞ";
  });
}

/**
 * 4 択問題を順に出して、最後に点数を表示する。
 * onDone は点数を保存し、結果画面に出すメッセージを返す
 */
function runQuestions(
  box: HTMLElement,
  questions: LessonQuestion[],
  onDone: (score: number) => string,
  onRetry?: () => void,
): void {
  let i = 0;
  let score = 0;
  const show = (): void => {
    if (i >= questions.length) {
      const msg = onDone(score);
      box.innerHTML = `
        <div class="score"><span class="big">${score}</span> / ${questions.length}</div>
        <p class="msg">${esc(msg)}</p>
        <button type="button" class="btn" id="again">もう一回</button>`;
      $<HTMLButtonElement>("#again", box).addEventListener("click", () => {
        if (onRetry) {
          onRetry();
          return;
        }
        i = 0;
        score = 0;
        show();
      });
      return;
    }
    const q = questions[i];
    box.innerHTML = `
      <div class="q-num">Q${i + 1} <span class="muted">/ ${questions.length}</span></div>
      <p class="q">${esc(q.q)}</p>
      ${q.svg ? `<div class="fig small">${q.svg}</div>` : ""}
      <div class="choices">${q.choices.map((c, k) => `<button type="button" class="choice" data-k="${k}">${esc(c)}</button>`).join("")}</div>
      <div class="explain" id="explain" hidden></div>`;
    const choices = $$<HTMLButtonElement>(".choice", box);
    for (const b of choices) {
      b.addEventListener("click", () => {
        const k = Number(b.dataset.k);
        for (const c of choices) {
          c.disabled = true;
        }
        const ok = k === q.answer;
        b.classList.add(ok ? "ok" : "ng");
        choices[q.answer].classList.add("ok");
        if (ok) {
          score++;
          sndOk();
        } else {
          sndNg();
        }
        const ex = $<HTMLElement>("#explain", box);
        ex.hidden = false;
        ex.className = `explain ${ok ? "good" : "bad"}`;
        ex.innerHTML = `<b>${ok ? "正解" : "残念"}</b> ${esc(q.explain)} <button type="button" class="btn small" id="q-next">${i + 1 < questions.length ? "次の問題" : "結果を見る"}</button>`;
        $<HTMLButtonElement>("#q-next", box).addEventListener("click", () => {
          i++;
          show();
        });
      });
    }
  };
  show();
}

// ---------------------------------------------------------------------------
// 練習ドリル
// ---------------------------------------------------------------------------
function renderDrill(view: HTMLElement, drill: Drill): void {
  const tabs = DRILLS.map(
    (d) =>
      `<a class="tag sel ${d.id === drill.id ? "on" : ""}" href="#learn/drill/${d.id}">${esc(d.title)}</a>`,
  ).join("");
  view.innerHTML = `
    <section class="drill">
      <a href="#learn" class="back">‹ レッスン一覧</a>
      <h2>練習ドリル</h2>
      <div class="tags drill-tabs">${tabs}</div>
      <p class="muted">${esc(drill.desc)}</p>
      <section class="check"><div id="drill-body"></div></section>
    </section>`;
  runQuestions(
    $<HTMLElement>("#drill-body", view),
    makeDrill(drill),
    (score) => {
      addDrillResult({
        drill: drill.id,
        correct: score,
        total: DRILL_COUNT,
        at: new Date().toISOString(),
      });
      sndDone();
      return score === DRILL_COUNT
        ? "満点！別のドリルにも挑戦しましょう"
        : score >= DRILL_COUNT * 0.8
          ? "よくできています。もう一回で満点を狙いましょう"
          : "間違えた分野のレッスンを読み返してから、もう一回";
    },
    () => renderDrill(view, drill),
  );
}

// ---------------------------------------------------------------------------
// きろく
// ---------------------------------------------------------------------------
const TAGS = ["おんぷ読み", "指の練習", "曲の練習", "レッスン復習", "その他"];

// ストップウォッチはタブを移動しても続くようにモジュール変数で持つ
let swStart: number | null = null;
let swAcc = 0;
let swTick: number | undefined;

const swElapsed = (): number => swAcc + (swStart ? Date.now() - swStart : 0);

function fmtSec(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function streak(entries: PracticeEntry[]): number {
  const days = new Set(entries.map((e) => e.date));
  let count = 0;
  const d = new Date();
  // 今日まだ記録がなくても昨日から続いていれば継続とみなす
  if (!days.has(localDate(d))) {
    d.setDate(d.getDate() - 1);
  }
  while (days.has(localDate(d))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function renderLog(view: HTMLElement): void {
  const entries = getPractice();
  const today = localDate();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekMin = entries
    .filter((e) => e.date >= localDate(weekAgo))
    .reduce((a, e) => a + e.minutes, 0);
  const totalMin = entries.reduce((a, e) => a + e.minutes, 0);

  // 直近 4 週間のドット
  const dots: string[] = [];
  const byDay = new Map<string, number>();
  for (const e of entries) {
    byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.minutes);
  }
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDate(d);
    const m = byDay.get(key) ?? 0;
    const lv = m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : 3;
    dots.push(
      `<span class="dot l${lv} ${key === today ? "today" : ""}" title="${key} ${m}分"></span>`,
    );
  }

  const quizRecent = getQuizResults().slice(0, 5);
  const quizHtml = quizRecent.length
    ? `<ul class="plain">${quizRecent
        .map((r) => {
          const lv = LEVELS.find((l) => l.id === r.level);
          return `<li><span class="muted">${r.at.slice(5, 10).replace("-", "/")}</span> ${esc(lv?.title ?? r.level)} <b>${r.correct}/${r.total}</b> <span class="muted">${r.avgSec.toFixed(1)}秒/問</span></li>`;
        })
        .join("")}</ul>`
    : `<p class="muted">まだ記録がありません</p>`;

  const list = entries.length
    ? entries
        .map(
          (e) => `
        <li class="entry" data-id="${e.id}">
          <div class="entry-head"><b>${e.date.replace(/^\d{4}-/, "").replace("-", "/")}</b> <span class="min">${e.minutes}分</span>
            <button type="button" class="del" data-id="${e.id}" aria-label="削除">削除</button></div>
          ${e.tags.length ? `<div class="tags">${e.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
          ${e.memo ? `<div class="memo">${esc(e.memo)}</div>` : ""}
        </li>`,
        )
        .join("")
    : `<li class="muted">まだ記録がありません。今日の練習を記録しましょう</li>`;

  view.innerHTML = `
    <section class="intro">
      <h2>練習きろく</h2>
      <div class="stats">
        <div class="stat"><div class="big">${streak(entries)}</div><div class="muted">連続日数</div></div>
        <div class="stat"><div class="big">${weekMin}</div><div class="muted">今週の分数</div></div>
        <div class="stat"><div class="big">${Math.round((totalMin / 60) * 10) / 10}</div><div class="muted">累計（時間）</div></div>
      </div>
      <div class="dots" aria-label="直近4週間の練習">${dots.join("")}</div>
    </section>

    <section class="card form">
      <h3>きょうの練習を記録</h3>
      <div class="sw">
        <div class="sw-time" id="sw-time">${fmtSec(swElapsed())}</div>
        <button type="button" class="btn" id="sw-toggle">${swStart ? "一時停止" : swAcc ? "再開" : "タイマー開始"}</button>
        <button type="button" class="btn" id="sw-reset" ${swAcc || swStart ? "" : "hidden"}>リセット</button>
      </div>
      <label>日付 <input type="date" id="f-date" value="${today}" max="${today}"></label>
      <label>練習時間（分）
        <div class="row tight">
          <input type="number" id="f-min" min="1" max="600" inputmode="numeric" placeholder="例: 20">
          <button type="button" class="chip" data-add="5">+5</button>
          <button type="button" class="chip" data-add="10">+10</button>
          <button type="button" class="chip" data-add="30">+30</button>
        </div>
      </label>
      <div class="label">内容</div>
      <div class="tags" id="f-tags">${TAGS.map((t) => `<button type="button" class="tag sel" data-tag="${esc(t)}">${esc(t)}</button>`).join("")}</div>
      <label>メモ <textarea id="f-memo" rows="2" placeholder="できたこと・つまずいたところ"></textarea></label>
      <div class="err" id="f-err" hidden></div>
      <button type="button" class="btn primary wide" id="f-save">保存する</button>
    </section>

    <section>
      <h3>これまでの記録</h3>
      <ul class="entries">${list}</ul>
    </section>
    <section>
      <h3>おんぷクイズの成績（最近5回）</h3>
      ${quizHtml}
    </section>`;

  // ストップウォッチ
  const swTime = $<HTMLElement>("#sw-time", view);
  const swToggle = $<HTMLButtonElement>("#sw-toggle", view);
  const swReset = $<HTMLButtonElement>("#sw-reset", view);
  const minInput = $<HTMLInputElement>("#f-min", view);
  const tick = (): void => {
    swTime.textContent = fmtSec(swElapsed());
  };
  const syncMinutes = (): void => {
    const m = Math.max(1, Math.round(swElapsed() / 60000));
    if (swElapsed() >= 30000) {
      minInput.value = String(m);
    }
  };
  if (swStart && !swTick) {
    swTick = window.setInterval(tick, 500);
  }
  swToggle.addEventListener("click", () => {
    if (swStart) {
      swAcc += Date.now() - swStart;
      swStart = null;
      window.clearInterval(swTick);
      swTick = undefined;
      swToggle.textContent = "再開";
      syncMinutes();
    } else {
      swStart = Date.now();
      swTick = window.setInterval(tick, 500);
      swToggle.textContent = "一時停止";
    }
    swReset.hidden = false;
    tick();
  });
  swReset.addEventListener("click", () => {
    swStart = null;
    swAcc = 0;
    window.clearInterval(swTick);
    swTick = undefined;
    swToggle.textContent = "タイマー開始";
    swReset.hidden = true;
    tick();
  });

  for (const c of $$<HTMLButtonElement>("[data-add]", view)) {
    c.addEventListener("click", () => {
      minInput.value = String(
        (Number(minInput.value) || 0) + Number(c.dataset.add),
      );
    });
  }
  for (const t of $$<HTMLButtonElement>("#f-tags .tag", view)) {
    t.addEventListener("click", () => {
      t.classList.toggle("on");
    });
  }
  $<HTMLButtonElement>("#f-save", view).addEventListener("click", () => {
    const minutes = Number(minInput.value);
    const err = $<HTMLElement>("#f-err", view);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      err.hidden = false;
      err.textContent = "練習時間（分）を入れてください";
      minInput.focus();
      return;
    }
    const tags = $$<HTMLButtonElement>("#f-tags .tag.on", view).map(
      (b) => b.dataset.tag ?? "",
    );
    addPractice({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: $<HTMLInputElement>("#f-date", view).value || today,
      minutes: Math.round(minutes),
      tags,
      memo: $<HTMLTextAreaElement>("#f-memo", view).value.trim(),
    });
    // 保存したらタイマーを戻す
    swStart = null;
    swAcc = 0;
    window.clearInterval(swTick);
    swTick = undefined;
    sndDone();
    renderLog(view);
  });

  // 削除は 2 タップ（誤タップ防止。confirm ダイアログは使わない）
  for (const d of $$<HTMLButtonElement>(".del", view)) {
    d.addEventListener("click", () => {
      if (d.dataset.armed) {
        removePractice(d.dataset.id ?? "");
        renderLog(view);
        return;
      }
      d.dataset.armed = "1";
      d.textContent = "本当に削除？";
      d.classList.add("armed");
      window.setTimeout(() => {
        d.dataset.armed = "";
        d.textContent = "削除";
        d.classList.remove("armed");
      }, 3000);
    });
  }
}

window.addEventListener("hashchange", route);
route();
