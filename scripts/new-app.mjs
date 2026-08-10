// テンプレートから新しいアプリを作る。
// 使い方: node scripts/new-app.mjs <アプリ名> ["説明文"]
// アプリ名は URL のパスになる（https://ssss-yajima.github.io/zatsu-pages/<アプリ名>/）。
import { cpSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [name, description = ""] = process.argv.slice(2);

if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) {
  console.error("使い方: node scripts/new-app.mjs <アプリ名> [\"説明文\"]");
  console.error("アプリ名は英小文字・数字・ハイフンのみ（URL のパスになります）");
  process.exit(1);
}

const dest = join("apps", name);
if (existsSync(dest)) {
  console.error(`apps/${name} は既に存在します`);
  process.exit(1);
}

cpSync(join("templates", "vanilla"), dest, { recursive: true });

for (const file of ["package.json", "index.html"]) {
  const path = join(dest, file);
  const content = readFileSync(path, "utf8")
    .replaceAll("__APP_NAME__", name)
    .replaceAll("__APP_DESCRIPTION__", description);
  writeFileSync(path, content);
}

console.log(`apps/${name} を作成しました`);
console.log("次の手順:");
console.log(`  cd apps/${name} && npm install && npm run dev`);
