var contextMenuItem = {
  id: "memorai",
  title: "Add to Memorai",
  contexts: ["selection"],
};

chrome.contextMenus.create(contextMenuItem);

chrome.contextMenus.onClicked.addListener(function (clickData) {
  if (clickData.menuItemId === "memorai" && clickData.selectionText) {
    chrome.storage.sync.set({ selection: clickData.selectionText }, () => {
      var notificationOpts = {
        type: "basic",
        iconUrl: "icon-48.png",
        title: "text selected!",
        message: "AI is generating questions now",
      };
      console.log(`saving ${clickData.selectionText}`)
      chrome.notifications.create("selectionNotification", notificationOpts);
      window.open("popup.html", "extension_popup", "width=300,height=400,status=no,scrollbars=yes,resizable=no");
No
    });
  }
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install" || details.reason === "update") {
    isUpdated();
  }
});

function isUpdated() {
  chrome.tabs.create({ url: "https://memorai.now.sh/" }, function (tab) {
    console.log("updated");
  });
}
