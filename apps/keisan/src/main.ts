import {
  isSoundOn,
  setSoundOn,
  sndFanfare,
  sndGoal,
  sndNg,
  sndOk,
  sndStart,
  sndTick,
} from "./audio";
import {
  OPS,
  PAD_STEP,
  PATTERNS,
  type Pattern,
  padRange,
  validatePatterns,
} from "./patterns";
import {
  addRecord,
  bestOf,
  clearRecords,
  getRecords,
  loadHintOn,
  loadQuizCount,
  loadSoundOn,
  type QuizCount,
  saveHintOn,
  saveQuizCount,
  saveSoundOn,
} from "./storage";
import "./style.css";

/* ============================================================
   ちいさな道具
   ============================================================ */
function $(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`#${id} が見つかりません`);
  }
  return el;
}

/* プレイ中の時計用。1年生に読めるよう分:秒や小数を使わず整数の秒だけ */
function fmt(ms: number): string {
  return String(Math.floor(ms / 1000));
}

/* 結果・ホーム用。単位付きで読み上げられる形にする */
function fmtKid(ms: number): string {
  const s = ms / 1000;
  if (s < 60) {
    return `${s.toFixed(1)}びょう`;
  }
  const m = Math.floor(s / 60);
  return `${m}ぷん ${Math.round(s - m * 60)}びょう`;
}

function fmtKidHtml(ms: number): string {
  return fmtKid(ms).replace(/(びょう|ぷん)/g, "<small>$1</small>");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}がつ${d.getDate()}にち`;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(name: "home" | "count" | "play" | "result" | "records"): void {
  for (const s of document.querySelectorAll(".screen")) {
    s.classList.remove("on");
  }
  $(`s-${name}`).classList.add("on");
}

/* ============================================================
   おと
   ============================================================ */
function paintSoundButtons(): void {
  $("btn-sound").textContent = `おと: ${isSoundOn() ? "あり" : "なし"}`;
  $("btn-sound2").textContent = isSoundOn() ? "🔊" : "🔇";
}

function toggleSound(): void {
  setSoundOn(!isSoundOn());
  paintSoundButtons();
  if (isSoundOn()) {
    sndTick();
  }
  saveSoundOn(isSoundOn());
}

/* ============================================================
   かずのヒント（数を◯●で見せる）
   ============================================================ */
let hintOn = false;

function paintHintButton(): void {
  $("btn-hint").textContent = `ヒント: ${hintOn ? "あり" : "なし"}`;
}

function toggleHint(): void {
  hintOn = !hintOn;
  paintHintButton();
  saveHintOn(hintOn);
}

/* 2桁が出るモードでは10個で改行し、10のまとまり（黄5+赤5）を見せる。
   1桁だけのモードは5個で改行（黄5のあと赤）。 */
/* ============================================================
   もんだいのかず（10もん / 20もん）
   記録は問題数ごとに別枠。20もんは従来キーのまま引き継ぐ
   ============================================================ */
let quizCount: QuizCount = 20;

function recId(patternId: string): string {
  return quizCount === 20 ? patternId : `${patternId}:${quizCount}`;
}

function paintCountButton(): void {
  $("btn-count").textContent = `もんだい: ${quizCount}もん`;
}

function toggleCount(): void {
  quizCount = quizCount === 20 ? 10 : 20;
  paintCountButton();
  saveQuizCount(quizCount);
  renderHome();
}

function renderDots(el: HTMLElement, n: number, tenWrap: boolean): void {
  if (!hintOn) {
    el.hidden = true;
    return;
  }
  let html = "";
  for (let i = 1; i <= n; i++) {
    const posInRow = tenWrap ? ((i - 1) % 10) + 1 : i;
    html += `<i class="dot ${posInRow <= 5 ? "y" : "r"}"></i>`;
  }
  el.className = tenWrap ? "dots ten" : "dots";
  el.innerHTML = html;
  el.hidden = false;
}

/* ============================================================
   ホーム
   ============================================================ */
function renderHome(): void {
  $("cards").innerHTML = PATTERNS.map((p) => {
    const list = getRecords(recId(p.id));
    const best = bestOf(list);
    const foot =
      best === null
        ? ""
        : `
        <div class="card-foot">
          <span>さいこうきろく</span><span class="rec">${fmtKid(best)}</span>
          <span class="go">${list.length}かい</span>
        </div>`;
    return `
      <button class="card" data-id="${p.id}">
        <div class="card-top">
          <span class="card-op lv${p.level}">${OPS[p.op].sym}</span>
          <span>
            <h2>${p.title}</h2>
            <p class="hint">${p.hint}</p>
          </span>
        </div>${foot}
      </button>`;
  }).join("");
  show("home");
}

/* ============================================================
   きろく（ランキングとりれき）
   ============================================================ */
let recordsPatternId = PATTERNS[0]?.id ?? "";

function rankRow(r: { t: number; m: number; d: string }, i: number): string {
  return `
    <li class="${i === 0 ? "top" : ""}">
      <span class="no">${i + 1}</span>
      <span class="t">${fmtKid(r.t)}</span>
      <span class="d">${fmtDate(r.d)}</span>
    </li>`;
}

function renderRecords(): void {
  $("rec-tabs").innerHTML = PATTERNS.map(
    (p) => `
    <button type="button" class="rec-tab ${p.id === recordsPatternId ? "on" : ""}" data-id="${p.id}">
      ${OPS[p.op].sym} ${p.title}
    </button>`,
  ).join("");

  const list = getRecords(recId(recordsPatternId));
  const empty = `<li class="empty">まだ きろくが ないよ</li>`;

  const best5 = list
    .slice()
    .sort((x, y) => x.t - y.t)
    .slice(0, 5);
  $("rec-rank").innerHTML = best5.map(rankRow).join("") || empty;

  $("rec-history").innerHTML =
    list
      .slice(0, 10)
      .map(
        (r) => `
    <li>
      <span class="hd">${fmtDate(r.d)}</span>
      <span class="t">${fmtKid(r.t)}</span>
    </li>`,
      )
      .join("") || empty;

  show("records");
}

/* 記録のけしかたは2タップ（まちがえて消さないように） */
let clearArmed = false;
let clearTimer = 0;

function onClearClick(): void {
  const b = $("btn-clear");
  if (!clearArmed) {
    clearArmed = true;
    b.textContent = "ほんとうに けす？";
    clearTimer = window.setTimeout(() => {
      clearArmed = false;
      b.textContent = "きろくを けす";
    }, 4000);
    return;
  }
  window.clearTimeout(clearTimer);
  clearArmed = false;
  b.textContent = "きろくを けす";
  for (const p of PATTERNS) {
    clearRecords(p.id);
    clearRecords(`${p.id}:10`);
  }
  renderHome();
}

/* ============================================================
   キーパッド
   ============================================================ */
/* 1〜5 / 6〜10 / 11〜15 / 16〜20 の列位置がそろうように、
   先頭に見えないマスを入れてから数字を並べる（数字の場所が毎回同じになる） */
function buildPad(pattern: Pattern): void {
  const [lo, hi] = padRange(pattern);
  const frag = document.createDocumentFragment();
  const gap = lo >= 1 ? (lo - 1) % PAD_STEP : 0;
  for (let i = 0; i < gap; i++) {
    const s = document.createElement("span");
    s.className = "key spacer";
    frag.appendChild(s);
  }
  for (let n = lo; n <= hi; n++) {
    const b = document.createElement("button");
    b.className = "key";
    b.textContent = String(n);
    b.dataset.n = String(n);
    frag.appendChild(b);
  }
  const pad = $("pad");
  pad.textContent = "";
  pad.appendChild(frag);
}

/* ============================================================
   ゲーム進行
   ============================================================ */
const state = {
  pattern: null as Pattern | null,
  queue: [] as [number, number][],
  idx: 0,
  mistakes: 0,
  t0: 0,
  raf: 0,
  locked: false,
  quit: false,
};

let wrongUntil = 0;
let pauseStart = 0;

function countdown(pattern: Pattern): void {
  if ($("s-count").classList.contains("on")) {
    return;
  }
  state.pattern = pattern;
  state.quit = false;
  show("count");
  const steps = ["3", "2", "1"];
  let i = 0;
  const num = $("count-num");
  num.className = "";
  num.textContent = steps[0];
  sndTick();
  const replay = () => {
    num.style.animation = "none";
    void num.offsetWidth;
    num.style.animation = "";
  };
  const tick = () => {
    if (state.quit) {
      return;
    }
    i++;
    if (i < steps.length) {
      num.textContent = steps[i];
      replay();
      sndTick();
      window.setTimeout(tick, 620);
    } else {
      num.textContent = "スタート！";
      num.classList.add("go");
      replay();
      sndStart();
      window.setTimeout(() => {
        if (!state.quit) {
          start();
        }
      }, 480);
    }
  };
  window.setTimeout(tick, 620);
}

function start(): void {
  const pattern = state.pattern;
  if (!pattern) {
    return;
  }
  state.queue = shuffle(pattern.pairs).slice(0, quizCount);
  state.idx = 0;
  state.mistakes = 0;
  state.locked = false;

  buildPad(pattern);
  $("stamps").innerHTML = state.queue.map(() => "<i></i>").join("");
  $("clock").textContent = "0";
  show("play");
  renderQuestion();

  state.t0 = performance.now();
  startClock();
}

function startClock(): void {
  const loop = () => {
    $("clock").textContent = fmt(performance.now() - state.t0);
    state.raf = requestAnimationFrame(loop);
  };
  state.raf = requestAnimationFrame(loop);
}

function renderQuestion(): void {
  const pattern = state.pattern;
  const pair = state.queue[state.idx];
  if (!pattern || !pair) {
    return;
  }
  const [a, b] = pair;
  const op = OPS[pattern.op];
  $("q-a").textContent = String(a);
  $("q-op").textContent = op.sym;
  $("q-b").textContent = String(b);
  $("q-ans").textContent = "?";
  const tenWrap = pattern.pairs.some(([x, y]) => x > 9 || y > 9);
  renderDots($("dots-a"), a, tenWrap);
  renderDots($("dots-b"), b, tenWrap);
  $("maru").classList.remove("draw");

  const cells = $("stamps").children;
  for (let i = 0; i < cells.length; i++) {
    cells[i].classList.toggle("done", i < state.idx);
    cells[i].classList.toggle("now", i === state.idx);
  }
}

function answer(n: number, btn: HTMLButtonElement): void {
  if (state.locked) {
    return;
  }
  const pattern = state.pattern;
  const pair = state.queue[state.idx];
  if (!pattern || !pair) {
    return;
  }
  const [a, b] = pair;
  const correct = OPS[pattern.op].calc(a, b);

  if (n !== correct) {
    // 7歳の指はタップが2連イベントになりがち。直後の誤答は数えない
    const now = performance.now();
    if (now < wrongUntil) {
      return;
    }
    wrongUntil = now + 350;
    state.mistakes++;
    sndNg();
    btn.classList.add("ng");
    const card = $("qcard");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
    window.setTimeout(() => btn.classList.remove("ng"), 340);
    return;
  }

  /* 正解 — 赤えんぴつでまるをつける */
  const elapsed = performance.now() - state.t0;
  state.locked = true;
  $("q-ans").textContent = String(n);
  $("maru").classList.add("draw");
  btn.classList.add("ok");
  sndOk();

  window.setTimeout(() => {
    btn.classList.remove("ok");
    state.locked = false;
    if (state.quit) {
      return;
    }
    if (state.idx === state.queue.length - 1) {
      finish(elapsed);
    } else {
      state.idx++;
      renderQuestion();
    }
  }, 260);
}

function finish(elapsed: number): void {
  const pattern = state.pattern;
  if (!pattern) {
    return;
  }
  cancelAnimationFrame(state.raf);
  sndGoal();

  const prevBest = bestOf(getRecords(recId(pattern.id)));
  addRecord(recId(pattern.id), {
    t: Math.round(elapsed),
    m: state.mistakes,
    d: new Date().toISOString(),
  });

  const isFirst = prevBest === null;
  const isBest = !isFirst && elapsed < prevBest;

  const badge = $("badge");
  if (isFirst || isBest) {
    badge.hidden = false;
    badge.textContent = isFirst ? "はじめての きろく！" : "しんきろく！";
    sndFanfare();
    celebrate();
  } else {
    badge.hidden = true;
  }
  // 全問完走のごほうび。新記録でなくても必ずはなまる
  const hanamaru = $("hanamaru");
  hanamaru.hidden = false;
  hanamaru.style.animation = "none";
  void hanamaru.offsetWidth;
  hanamaru.style.animation = "";

  $("r-time").innerHTML = fmtKidHtml(elapsed);
  $("r-note").textContent =
    state.mistakes === 0
      ? "ぜんもん いっぱつ せいかい！ すごい！"
      : `${state.queue.length}もん ぜんぶ とけたよ！`;

  const best3 = getRecords(recId(pattern.id))
    .slice()
    .sort((x, y) => x.t - y.t)
    .slice(0, 3);
  $("r-rank").innerHTML =
    best3.map(rankRow).join("") || `<li class="empty">きろくが ありません</li>`;

  show("result");
}

/* しんきろくの紙吹雪 */
function celebrate(): void {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  const canvas = $("confetti") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  canvas.hidden = false;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#e5432c", "#ffc93c", "#2fae63", "#4aa3e0", "#1f3552"];
  const parts = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vx: -1 + Math.random() * 2,
    vy: 2.2 + Math.random() * 3,
    rot: Math.random() * Math.PI,
    vr: -0.15 + Math.random() * 0.3,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const end = performance.now() + 2400;
  const step = (now: number) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (now < end) {
      requestAnimationFrame(step);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.hidden = true;
    }
  };
  requestAnimationFrame(step);
}

function goHome(): void {
  state.quit = true;
  cancelAnimationFrame(state.raf);
  $("quit-dialog").hidden = true;
  renderHome();
}

/* やめる確認。開いている間はタイマーを止め、つづける時に停止分を差し引く */
function openQuitDialog(): void {
  if (!$("quit-dialog").hidden) {
    return;
  }
  pauseStart = performance.now();
  cancelAnimationFrame(state.raf);
  $("quit-dialog").hidden = false;
}

function resumePlay(): void {
  $("quit-dialog").hidden = true;
  state.t0 += performance.now() - pauseStart;
  startClock();
}

/* ============================================================
   イベント登録と起動
   ============================================================ */
$("cards").addEventListener("click", (e) => {
  const c = (e.target as HTMLElement).closest<HTMLElement>(".card");
  if (!c) {
    return;
  }
  const p = PATTERNS.find((x) => x.id === c.dataset.id);
  if (p) {
    countdown(p);
  }
});

$("pad").addEventListener("click", (e) => {
  const k = (e.target as HTMLElement).closest<HTMLButtonElement>("button.key");
  if (k) {
    answer(Number(k.dataset.n), k);
  }
});

$("btn-sound").addEventListener("click", toggleSound);
$("btn-sound2").addEventListener("click", toggleSound);
$("btn-hint").addEventListener("click", toggleHint);
$("btn-count").addEventListener("click", toggleCount);
$("btn-clear").addEventListener("click", onClearClick);
$("btn-records").addEventListener("click", renderRecords);
$("btn-records-back").addEventListener("click", goHome);
$("rec-tabs").addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest<HTMLButtonElement>(".rec-tab");
  if (t?.dataset.id) {
    recordsPatternId = t.dataset.id;
    renderRecords();
  }
});
$("btn-quit").addEventListener("click", openQuitDialog);
$("btn-quit-yes").addEventListener("click", goHome);
$("btn-quit-no").addEventListener("click", resumePlay);
$("btn-home").addEventListener("click", goHome);
$("btn-again").addEventListener("click", () => {
  if (state.pattern) {
    countdown(state.pattern);
  }
});

validatePatterns();
setSoundOn(loadSoundOn());
paintSoundButtons();
hintOn = loadHintOn();
paintHintButton();
quizCount = loadQuizCount();
paintCountButton();
renderHome();
