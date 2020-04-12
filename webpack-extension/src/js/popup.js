import App from "../svelte/Popup.svelte";

const app = new App({
  target: document.body,
  props: {
    name: "Jords",
  },
});

window.app = app;

export default app;
