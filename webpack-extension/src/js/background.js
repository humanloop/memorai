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
    chrome.storage.local.set({ selection: clickData.selectionText }, function() {
      console.log(clickData.selectionText);
    });
  }
});
