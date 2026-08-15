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

function blockHtml(b: Block): string {
  let h = '<div class="block">';
  if (b.h) {
    h += `<h4>${esc(b.h)}</h4>`;
  }
  if (b.html) {
    h += `<p>${b.html}</p>`;
  }
  if (b.fig) {
    h += `<figure class="fig">${b.fig}${b.cap ? `<figcaption>${b.cap}</figcaption>` : ""}</figure>`;
  }
  if (b.list) {
    h += `<ul>${b.list.map((li) => `<li>${li}</li>`).join("")}</ul>`;
  }
  if (b.table) {
    const [head, ...rows] = b.table;
    h += `<div class="table-wrap"><table><thead><tr>${head.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
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

function chapterHtml(ch: Chapter): string {
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
      <nav class="toc" aria-label="目次">
        <div class="toc-title">目次</div>
        <ol class="toc-parts">${toc}<li><div class="toc-part">付録</div><ol><li><a href="#appendix">早見表</a></li></ol></li></ol>
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
    </div>`;

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
