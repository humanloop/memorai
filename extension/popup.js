function getLocal(key) {
  chrome.storage.local.get(key, function (res) {
    console.log(res[key]);
    return res[key];
  });
}


$(document).ready(() => {
  chrome.storage.onChanged.addListener(function (changes, storageName) {
    console.log("New item in storage", changes);
  });
  let selection = getLocal("selection");
  $("#selection").text(selection);
  $("#getLocalButton").click(() => {
    let selection = getLocal("selection");
    $("#selection").text(selection);
  });
});
