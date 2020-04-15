import App from "./Popup.svelte";
import "../css/popup.css";

const app = new App({
  target: document.body,
  props: {
    name: "Jords",
  },
});

window.app = app;

export default app;