# zatsu-pages

雑多な単発静的アプリの置き場。`apps/` にアプリを足すと、GitHub Pages に自動デプロイされる。

- **公開URL**: https://ssss-yajima.github.io/zatsu-pages/
- **各アプリ**: https://ssss-yajima.github.io/zatsu-pages/&lt;アプリ名&gt;/
- トップページ（アプリ一覧）はデプロイ時に自動生成される

## 新しいアプリを足すには

必須コマンドは [go-task](https://taskfile.dev) の Taskfile にまとまっている（開発ルールの全体は [AGENTS.md](AGENTS.md) 参照）:

```sh
# 1. テンプレートから雛形を作る（npm install まで実行される）
task new NAME=my-app DESC="アプリの説明"

# 2. 開発する
task dev APP=my-app

# 3. 確認する
task check APP=my-app   # Biome lint + 型チェック
task site               # 全ビルド + トップページ込みでローカルプレビュー

# 4. main に push すると自動でデプロイされる（PR を切れば変更アプリだけ CI 検査）
```

アプリ一覧に表示される名前や絵文字は、各アプリの `package.json` で変えられる:

```json
{
  "description": "一覧に表示される説明文",
  "zatsu": { "title": "たしざんれんしゅう", "emoji": "🧮" }
}
```

## 設計

| 決めごと | 内容 |
| --- | --- |
| ホスティング | GitHub Pages（GitHub Actions からデプロイ） |
| ビルド基盤 | 全アプリ Vite + TypeScript で統一 |
| UI 層 | アプリごとに自由（vanilla / React など何でも可） |
| アプリ間の共有 | しない。各アプリは自己完結（コピペ上等） |
| 依存管理 | 各アプリが自分の `package.json` とロックファイルを持つ。完全独立 |
| 品質チェック | Biome + tsc（テンプレートに焼き込み）。PR 時は変更アプリのみ CI 検査 |
| デザイン統一 | 仕組みでは縛らず、AGENTS.md の規範を AI に従わせる |

<details>
<summary>設計判断の背景</summary>

- **完全独立にした理由**: アプリ間で依存やコードを共有すると密結合の温床になる。このレポは「置き場」に徹し、各アプリはいつでも単体で切り出せる状態を保つ。
- **Vite + TS で統一した理由**: ビルドあり・なしが混在するとデプロイ構成が複雑化する。土台だけ揃えて UI 層は自由にすることで、構成は 1 本のまま雑多さを許容する。
- **腐り対策**: 依存バージョンはアプリごとにバラけるが、それは独立性の代償として受け入れる。あるアプリがビルド不能になってデプロイを道連れにした場合は、そのアプリを修理するか `apps/` の外（例: `attic/`）に退避して除外する。
- **`base: './'`**: 各アプリの Vite 設定は相対パスベース。サブパス（`/zatsu-pages/<app>/`）配下でもパス設定なしで動く。

</details>

<details>
<summary>リポジトリ構成</summary>

```
zatsu-pages/
├── AGENTS.md              # 開発ルール（コマンド・規約・デザイン/品質規範）
├── CLAUDE.md              # AGENTS.md への参照
├── Taskfile.yml           # 必須コマンド（task new / dev / check / build / site）
├── apps/                  # 各アプリ（1ディレクトリ = 1アプリ = 1デプロイパス）
│   ├── hello/             # 動作確認用サンプル
│   └── keisan/            # けいさんれんしゅう（小1向け計算練習）
├── templates/
│   └── vanilla/           # 新アプリの雛形（Vite + TS + Biome、フレームワークなし）
├── scripts/
│   ├── new-app.mjs        # テンプレートから新アプリを作る
│   └── generate-index.mjs # トップページ（アプリ一覧）を生成する
└── .github/workflows/
    ├── deploy.yml         # main への push で全アプリをビルドして Pages にデプロイ
    └── ci.yml             # PR で変更のあったアプリだけ check + build
```

</details>
