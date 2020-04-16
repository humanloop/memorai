import "../css/options.css";

import App from "./Options.svelte";

const app = new App({
  target: document.body,
});

window.app = app;

export default app;
