import App from "./Popup.svelte";
import "../css/popup.css";

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.msg === "something_completed") {
    //  To do something
    alert(request.data.subject);
    alert(request.data.content);
  }
});

const app = new App({
  target: document.body,
  props: {
    name: "Jords",
  },
});

window.app = app;

export default app;
