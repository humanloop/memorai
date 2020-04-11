var fileChooser = document.createElement("input");
fileChooser.type = "file";

fileChooser.addEventListener("change", function (evt) {
  var f = evt.target.files[0];
  if (f) {
    var reader = new FileReader();
    reader.onload = function (e) {
      var contents = e.target.result;
      /* Handle your document contents here */
      chrome.runtime.sendMessage({ action: "importedNotes", data: contents });
    };
    reader.readAsText(f);
  }
});

document.body.appendChild(fileChooser);
fileChooser.click();
