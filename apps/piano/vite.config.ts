import { defineConfig } from "vite";

// base: "./" — /zatsu-pages/<アプリ名>/ のようなサブパス配下でも動くよう相対パスにする
// textbook.html は教科書ページ（マルチページ構成）
export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        textbook: "textbook.html",
      },
    },
  },
});
