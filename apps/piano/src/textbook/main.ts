import "./style.css";
import { APPENDIX, type Block, type Chapter, PARTS } from "./content";

const root = document.querySelector<HTMLDivElement>("#app");
if (!root) {
  throw new Error("#app が見つかりません");
}
const app: HTMLDivElement = root;

// チェックリストの保存（piano: プレフィックス必須）
const KEY = "piano:textbook:checks";
function loadChecks(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Record<
      string,
      boolean
    >;
  } catch {
    return {};
  }
}
function saveChecks(c: Record<string, boolean>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    // 保存できなくても続行
  }
}
let checks = loadChecks();

const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * 楽譜 SVG は高さ 130px 基準の自然幅を上限にして、狭い画面では幅いっぱいに縮小する
 * （横スクロールで右半分が隠れるのを防ぐ）
 */
function fitStaff(svg: string): string {
  return svg.replace(
    /<svg class="staff" viewBox="0 0 (\d+(?:\.\d+)?) (\d+(?:\.\d+)?)"/,
    (m, w: string, hgt: string) => {
      const natural = Math.round((Number(w) * 130) / Number(hgt));
      return `${m} style="width:min(100%, ${natural}px)"`;
    },
  );
}

function blockHtml(b: Block): string {
  let h = '<div class="block">';
  if (b.h) {
    h += `<h4>${esc(b.h)}</h4>`;
  }
  if (b.html) {
    h += `<p>${b.html}</p>`;
  }
  if (b.fig) {
    h += `<figure class="fig">${fitStaff(b.fig)}${b.cap ? `<figcaption>${b.cap}</figcaption>` : ""}</figure>`;
  }
  if (b.list) {
    h += `<ul>${b.list.map((li) => `<li>${li}</li>`).join("")}</ul>`;
  }
  if (b.table) {
    const [head, ...rows] = b.table;
    h += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr>${r
            .map((c, i) =>
              // 短い先頭セル（「10分」「♯1」など）は折り返さない
              i === 0 && c.length <= 6
                ? `<td class="nw">${c}</td>`
                : `<td>${c}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
  }
  if (b.point) {
    h += `<div class="callout point"><span class="callout-label">ポイント</span>${b.point}</div>`;
  }
  if (b.avoid) {
    h += `<div class="callout avoid"><span class="callout-label">避けること</span>${b.avoid}</div>`;
  }
  return `${h}</div>`;
}

const ALL_CHAPTERS: Chapter[] = PARTS.flatMap((p) => p.chapters);

function chapterHtml(ch: Chapter): string {
  const idx = ALL_CHAPTERS.indexOf(ch);
  const prev = ALL_CHAPTERS[idx - 1];
  const next = ALL_CHAPTERS[idx + 1];
  const nav = `<nav class="chapter-nav">${prev ? `<a href="#${prev.id}">‹ ${esc(prev.title)}</a>` : "<span></span>"}${next ? `<a href="#${next.id}">${esc(next.title)} ›</a>` : `<a href="#appendix">付録 早見表 ›</a>`}</nav>`;
  const items = ch.checklist
    .map((c, i) => {
      const id = `${ch.id}:${i}`;
      return `<label class="check-item"><input type="checkbox" data-check="${id}" ${checks[id] ? "checked" : ""}> <span>${esc(c)}</span></label>`;
    })
    .join("");
  return `
    <section class="chapter" id="${ch.id}">
      <div class="chapter-head">
        <div class="chapter-num">第${ch.num}章</div>
        <h3>${esc(ch.title)}</h3>
        <div class="chapter-meta"><span class="period">🗓 ${esc(ch.period)}</span></div>
        <div class="goal"><b>ゴール:</b> ${esc(ch.goal)}</div>
      </div>
      ${ch.blocks.map(blockHtml).join("")}
      <div class="checklist">
        <div class="checklist-title">できたらチェック</div>
        ${items}
      </div>
      ${nav}
    </section>`;
}

function render(): void {
  const total = PARTS.flatMap((p) => p.chapters).flatMap(
    (c) => c.checklist,
  ).length;
  const done = Object.values(checks).filter(Boolean).length;
  const toc = PARTS.map(
    (p) =>
      `<li><div class="toc-part">${esc(p.title)}</div><ol>${p.chapters
        .map((c) => {
          const n = c.checklist.length;
          const d = c.checklist.filter((_, i) => checks[`${c.id}:${i}`]).length;
          return `<li><a href="#${c.id}">${esc(c.title)}</a> <span class="toc-prog ${d === n ? "full" : ""}">${d}/${n}</span></li>`;
        })
        .join("")}</ol></li>`,
  ).join("");

  app.innerHTML = `
    <header class="hero">
      <div class="hero-inner">
        <div class="eyebrow">ピアノのきほん</div>
        <h1>大人の初心者のための<br>ピアノ練習 教科書</h1>
        <p class="lead">楽譜は手元の教本を使い、この教科書では<b>何を・どの順で・どう練習するか</b>を身につけます。姿勢から表現まで、およそ 6 か月の段階的なテキスト。</p>
        <div class="progress-line"><div class="progress-bar" style="width:${total ? (done / total) * 100 : 0}%"></div></div>
        <div class="progress-text">チェック達成 ${done} / ${total}</div>
      </div>
    </header>
    <div class="layout">
      <nav class="toc" aria-label="目次" id="toc">
        <details class="toc-details" open>
          <summary class="toc-title">目次</summary>
          <ol class="toc-parts">${toc}<li><div class="toc-part">付録</div><ol><li><a href="#appendix">早見表</a></li></ol></li></ol>
        </details>
      </nav>
      <main class="body">
        <section class="howto">
          <h2>この教科書の使い方</h2>
          <ul>
            <li><b>順番に読む</b>。各章の冒頭に「時期の目安」と「ゴール」、末尾に「できたらチェック」があります。チェックが全部つくまで次の章に進まなくてよい、というルールではありません。<b>7割できたら次へ</b>、前の章は日々の練習で磨きます。</li>
            <li><b>楽譜は教本で</b>。子ども用の教本で十分です。この教科書の図は「何を見るべきか」を示すためのもので、練習曲の代わりではありません。</li>
            <li><b>アプリと併用</b>: 読譜は「おんぷ」「曲で読む」、知識は「まなぶ」、記録は「きろく」。第7部の練習設計に沿って回します。</li>
            <li><b>迷ったら第12章</b>（練習の設計）と付録の早見表へ。</li>
          </ul>
        </section>
        ${PARTS.map(
          (p) => `
          <section class="part">
            <div class="part-head"><h2>${esc(p.title)}</h2><p class="part-lead">${esc(p.lead)}</p></div>
            ${p.chapters.map(chapterHtml).join("")}
          </section>`,
        ).join("")}
        <section class="part" id="appendix">
          <div class="part-head"><h2>付録 — 早見表</h2><p class="part-lead">練習前・行き詰まったときに、ここだけ見返す。</p></div>
          <section class="chapter">${APPENDIX.map(blockHtml).join("")}</section>
        </section>
        <footer class="foot">
          <p>チェックの状態はこの端末（ブラウザ）に保存されます。</p>
          <p><a href="./">← アプリに戻る</a></p>
        </footer>
      </main>
    </div>
    <a class="to-toc" href="#toc" aria-label="目次へ戻る">目次 ↑</a>`;

  // スマホでは目次を折りたたんで本文へすぐ行けるようにする
  const details = app.querySelector<HTMLDetailsElement>(".toc-details");
  if (details && window.matchMedia("(max-width: 800px)").matches) {
    details.open = false;
  }
  watchCurrentChapter();

  for (const cb of Array.from(
    app.querySelectorAll<HTMLInputElement>("input[data-check]"),
  )) {
    cb.addEventListener("change", () => {
      checks = { ...checks, [cb.dataset.check ?? ""]: cb.checked };
      saveChecks(checks);
      // 進捗表示だけ更新（本文はそのまま）
      updateProgress();
    });
  }
}

/** 読んでいる章を目次でハイライトする */
function watchCurrentChapter(): void {
  const links = new Map<string, HTMLAnchorElement>();
  for (const a of Array.from(
    app.querySelectorAll<HTMLAnchorElement>(".toc a"),
  )) {
    links.set(a.getAttribute("href")?.slice(1) ?? "", a);
  }
  const visible = new Set<string>();
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          visible.add(e.target.id);
        } else {
          visible.delete(e.target.id);
        }
      }
      // 画面内にある章のうち、いちばん上のものを現在地にする
      let current: string | null = null;
      for (const ch of [...ALL_CHAPTERS.map((c) => c.id), "appendix"]) {
        if (visible.has(ch)) {
          current = ch;
          break;
        }
      }
      for (const [id, a] of links) {
        a.classList.toggle("is-current", id === current);
      }
    },
    { rootMargin: "-10% 0px -60% 0px" },
  );
  for (const sec of Array.from(
    app.querySelectorAll<HTMLElement>("section[id]"),
  )) {
    io.observe(sec);
  }
}

function updateProgress(): void {
  const total = PARTS.flatMap((p) => p.chapters).flatMap(
    (c) => c.checklist,
  ).length;
  const done = Object.values(checks).filter(Boolean).length;
  const bar = app.querySelector<HTMLElement>(".progress-bar");
  const txt = app.querySelector<HTMLElement>(".progress-text");
  if (bar) {
    bar.style.width = `${(done / total) * 100}%`;
  }
  if (txt) {
    txt.textContent = `チェック達成 ${done} / ${total}`;
  }
  for (const p of PARTS) {
    for (const c of p.chapters) {
      const n = c.checklist.length;
      const d = c.checklist.filter((_, i) => checks[`${c.id}:${i}`]).length;
      const el = app.querySelector<HTMLElement>(
        `.toc a[href="#${c.id}"] + .toc-prog`,
      );
      if (el) {
        el.textContent = `${d}/${n}`;
        el.classList.toggle("full", d === n);
      }
    }
  }
}

render();
