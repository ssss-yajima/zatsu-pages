import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app が見つかりません");
}

app.innerHTML = `
  <main>
    <h1>__APP_NAME__</h1>
    <p>ここから作り始める</p>
  </main>
`;
