# AGENTS.md — 開発ガイド

雑多な単発静的アプリを GitHub Pages でホストするリポジトリ。
公開 URL: `https://ssss-yajima.github.io/zatsu-pages/<アプリ名>/`

## 必須コマンド（ルートで実行、go-task）

| コマンド | 何をするか |
| --- | --- |
| `task new NAME=my-app DESC="説明"` | テンプレートから新アプリ作成 + npm install |
| `task dev APP=my-app` | 開発サーバ起動 |
| `task check [APP=my-app]` | Biome lint + tsc 型チェック（APP 省略で全アプリ） |
| `task fix [APP=my-app]` | Biome の自動修正 |
| `task build [APP=my-app]` | ビルド（APP 省略で全アプリ） |
| `task site` | 全ビルド + トップページ生成 + localhost:8000 でプレビュー |

## 鉄の掟

- **アプリ間でコード・依存を共有しない**。似た処理が必要ならコピーする（コピペ上等）
- 各アプリは **Vite + TypeScript**。`vite.config.ts` の `base: "./"` は変えない（サブパス配信のため）
- あるアプリの作業中に**他アプリのディレクトリに触らない**
- `templates/` の変更は既存アプリに遡及しない（新アプリにだけ効く）
- **localStorage のキーは必ず `<アプリ名>:` プレフィックス**を付ける（例: `keisan:records`）。
  GitHub Pages は同一オリジンなので localStorage が全アプリで共有され、素のキーは衝突する

## 新アプリの手順

1. `task new NAME=my-app DESC="一覧に出る説明文"`
2. `apps/my-app/package.json` の `zatsu.title`（日本語表示名）と `zatsu.emoji` を設定する
3. 開発し、`task check APP=my-app` と `task build APP=my-app` が通ることを確認する
4. PR を切れば CI が変更アプリだけ検査する。main へ push すると全ビルド + デプロイ

## デザイン規範（ゆるい統一）

仕組みでは縛らない。新アプリを作るときは以下に従う:

- **モバイルファースト**。スマホ縦持ちで完結する UI にする
- **日本語 UI**。対象者に語彙を合わせる（子ども向けはひらがな中心、タップ領域 44px 以上、文字大きめ）
- 基本は system-ui 系フォント + light/dark 対応（`color-scheme`）。
  ただしアプリの世界観（子ども向けの手書き風など）が優先。世界観を作るなら中途半端にしない
- **外部 CDN・Web フォント・外部 API に依存しない**。完全静的でオフラインでも動くこと
- トップページ一覧で見劣りしないよう `description` / `zatsu.title` / `zatsu.emoji` を必ず設定する

## 品質規範

- TypeScript strict / `task check` / `task build` がすべて通ること
- 依存は最小限。フレームワークは自由（vanilla 可）だが、単発アプリに重い依存を安易に足さない
- localStorage に保存するデータのスキーマを変えるときは、古いデータを読んでも壊れないようにする
- 効果音・画像などのアセットもリポジトリ内で完結させる（Web Audio での生成音は歓迎）

## 構成の背景

設計判断の経緯（完全独立にした理由、腐り対策など）は README.md の「設計」を参照。
