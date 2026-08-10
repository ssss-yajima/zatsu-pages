// トップページ（アプリ一覧）を生成する。
// 使い方: node scripts/generate-index.mjs <出力先ディレクトリ>
// apps/*/package.json を読み、zatsu.title / zatsu.emoji / description を一覧に反映する。
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "_site";
const appsDir = "apps";

const apps = [];
for (const name of readdirSync(appsDir).sort()) {
  const pkgPath = join(appsDir, name, "package.json");
  if (!existsSync(pkgPath)) continue;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  apps.push({
    slug: name,
    title: pkg.zatsu?.title ?? name,
    emoji: pkg.zatsu?.emoji ?? "📦",
    description: pkg.description ?? "",
  });
}

const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const cards = apps
  .map(
    (app) => `      <a class="card" href="./${esc(app.slug)}/">
        <span class="emoji">${esc(app.emoji)}</span>
        <span class="body">
          <span class="title">${esc(app.title)}</span>
          <span class="desc">${esc(app.description)}</span>
        </span>
      </a>`,
  )
  .join("\n");

const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>zatsu pages</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #faf9f7;
      --fg: #1f2328;
      --muted: #6b7280;
      --card-bg: #ffffff;
      --card-border: #e5e2dc;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #16181d;
        --fg: #e6e6e6;
        --muted: #9aa0a6;
        --card-bg: #1f2229;
        --card-border: #33363d;
      }
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif;
      line-height: 1.6;
    }
    main { max-width: 40rem; margin: 0 auto; padding: 3rem 1.25rem 4rem; }
    h1 { font-size: 1.5rem; margin: 0 0 0.25rem; }
    p.lead { color: var(--muted); margin: 0 0 2rem; }
    .cards { display: grid; gap: 0.75rem; }
    .card {
      display: flex; gap: 0.9rem; align-items: center;
      padding: 1rem 1.1rem;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 0.75rem;
      text-decoration: none; color: inherit;
      transition: border-color 0.15s ease;
    }
    .card:hover { border-color: var(--muted); }
    .emoji { font-size: 1.8rem; }
    .body { display: flex; flex-direction: column; }
    .title { font-weight: 600; }
    .desc { color: var(--muted); font-size: 0.9rem; }
    .empty { color: var(--muted); }
  </style>
</head>
<body>
  <main>
    <h1>zatsu pages</h1>
    <p class="lead">雑多なアプリ置き場</p>
    <div class="cards">
${cards || '      <p class="empty">まだアプリがありません。</p>'}
    </div>
  </main>
</body>
</html>
`;

writeFileSync(join(outDir, "index.html"), html);
console.log(`index.html を生成しました（${apps.length} アプリ）`);
