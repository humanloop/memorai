chrome.storage.sync.get("selection", function (res) {
  console.log(res.selection);
  console.log($('#selection'));
  $('#selection').text(res.selection);
});


