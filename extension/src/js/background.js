import "../img/icon-128.png";
import "../img/icon-faded-64.png";
import "../img/icon-blue-64.png";
import "../img/memorai.png";
import "../img/icon-outline-64.png";
import "../img/icon-64.png";

var contextMenuItem = {
  id: "memorai",
  title: "Add to Memorai",
  contexts: ["selection"],
};


chrome.contextMenus.create(contextMenuItem);

chrome.contextMenus.onClicked.addListener(function (clickData) {
  chrome.browserAction.getPopup({}, console.log)
  if (clickData.menuItemId === "memorai" && clickData.selectionText) {
    chrome.storage.local.set({ selection: clickData.selectionText }, function () {
      console.log(clickData.selectionText);
      chrome.browserAction.setIcon({path: 'icon-outline-64.png'});
    });
  }
});
