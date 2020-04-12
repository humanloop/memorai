import '../img/icon-128.png'
import '../img/icon-64.png'


var contextMenuItem = {
  id: "memorai",
  title: "Add to Memorai",
  contexts: ["selection"],
};

chrome.contextMenus.create(contextMenuItem);

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId === "memorai" && clickData.selectionText) {
    chrome.storage.local.set({ selection: clickData.selectionText }, () => {
      var notificationOpts = {
        type: "basic",
        iconUrl: "public/icon-64.png",
        title: "text selected!",
        message: "AI is generating questions now",
      };
      console.log(clickData.selectionText);
      chrome.notifications.create("selectionNotification", notificationOpts);
    });
  }
});
