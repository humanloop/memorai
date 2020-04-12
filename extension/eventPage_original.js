// /*jshint esversion: 6 */
var currentFields;
var currentNoteType;
var savedFormFields = savedFormFields || [];
var currentDeck;
var deckNamesSaved;
var manifest = chrome.runtime.getManifest();
var onceTimeForceSync;
var currentTags;
var connectionStatus;
var modelNamesSaved;
var storedFieldsForModels = storedFieldsForModels || {};
var allSettings = {};
var allSavedNotes = [];
var stickyFields = {};
var favourites = {};
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.action === "wakeup") {
  } else if (message.action === "importedNotes") {
    if (isValidValue(message.data)) {
      try {
        let importedNotes = JSON.parse(message.data);
        if (importedNotes.length > 0) {
          let duplicateCounter = 0;
          let importNotesCounter = 0;
          if (!isValidValue(allSavedNotes)) {
            allSavedNotes = [];
          }

          for (let item in importedNotes) {
            if (allSavedNotes.indexOf(importedNotes[item]) === -1) {
              allSavedNotes.push(importedNotes[item]);
              importNotesCounter++;
            } else {
              duplicateCounter++;
            }
          }

          let duplicateNotesMsg =
            duplicateCounter > 0 ? "duplicates found: " + duplicateCounter : "";
          let importNotesMsg =
            importNotesCounter > 0
              ? "Notes imported: " + importNotesCounter
              : " No new notes were imported  :";

          notifyUser(importNotesMsg + duplicateNotesMsg, "notifyalert");
          saveChanges("allSavedNotes", allSavedNotes);
        } else {
          notifyUser("Cant parse the file", "notifyalert");
        }
      } catch (errors) {
        notifyUser(errors.toString(), "notifyalert");
      }
    }
  }
});

chrome.runtime.onInstalled.addListener(function (details) {
  if (details.reason === "install") {
    isInstalledNow();
  } else if (details.reason === "update") {
    isUpdatedNow(0);
  }
});

/* The function that finds and returns the selected text */
var funcToInject = function () {
  var selection = window.getSelection();
  return selection.rangeCount > 0 ? selection.toString() : "";
};

/* This line converts the above function to string
 * (and makes sure it will be called instantly) */
var jsCodeStr = ";(" + funcToInject + ")();";

chrome.commands.onCommand.addListener(function (cmd) {
  if (cmd !== "submit-data-to-popup") {
    /* Inject the code into all frames of the active tab */
    chrome.tabs.executeScript(
      {
        code: jsCodeStr,
        allFrames: true, //  <-- inject into all frames, as the selection
        //      might be in an iframe, not the main page
      },
      function (selectedTextPerFrame) {
        if (chrome.runtime.lastError) {
          /* show error */
          createNotification("ERROR:\n" + chrome.runtime.lastError.message);
        } else if (
          selectedTextPerFrame.length > 0 &&
          typeof selectedTextPerFrame[0] === "string"
        ) {
          /* The results are as expected */
          if (selectedTextPerFrame[0]) {
            try {
              var fieldToAdd;
              var displayText;
              var currentText = selectedTextPerFrame[0];

              if (cmd === "add-to-first-field") {
                fieldToAdd = 0;
              } else if (cmd === "add-to-second-field") {
                fieldToAdd = 1;
              } else if (cmd === "add-to-third-field") {
                fieldToAdd = 2;
              }
              if (currentText.length < 30) {
                displayText = currentText;
              } else {
                displayText = currentText.slice(0, 30) + "...";
              }

              var currentFieldName = currentFields[fieldToAdd];

              if (isValidValue(currentFieldName)) {
                if (allSettings.appendModeSettings == 1) {
                  if (isValidValue(savedFormFields[fieldToAdd])) {
                    savedFormFields[fieldToAdd] =
                      savedFormFields[fieldToAdd] + "<br>" + currentText;
                    createNotification(
                      "Appended: " +
                        displayText +
                        " to field: " +
                        currentFieldName
                    );
                  } else {
                    savedFormFields[fieldToAdd] = currentText;
                    createNotification(
                      "Added: " + displayText + " to field: " + currentFieldName
                    );
                  }
                } else {
                  savedFormFields[fieldToAdd] = currentText;
                  createNotification(
                    "Added: " + displayText + " to field: " + currentFieldName
                  );
                }
                chrome.runtime.sendMessage({
                  msg: "addedFields",
                  data: savedFormFields,
                });
                saveChanges("savedFormFields", savedFormFields, "local");
              } else {
                createNotification(
                  "Sorry, No Field number " +
                    (fieldToAdd + 1) +
                    " for Model:" +
                    currentNoteType
                );
              }
            } catch (e) {
              debugLog(e);
              createNotification(
                "Error: please open Anki, then extension pop to sync."
              );
            }
          } else {
            debugLog("null added");
          }
        }
      }
    );
  } else if (cmd === "submit-data-to-popup") {
    submitToAnki();
  }
});

function ankiConnectRequest(action, version, params = {}) {
  return new Promise((resolve, reject) => {
    if (
      typeof window[action + "Saved"] != "undefined" &&
      (allSettings.syncFrequency === "Manual" || onceTimeForceSync === 0) &&
      (action != "sync" || action != "addNote")
    ) {
      resolve(window[action + "Saved"]);
    } else {
      const xhr = new XMLHttpRequest();
      xhr.addEventListener("error", () =>
        reject("failed to connect to AnkiConnect")
      );
      xhr.addEventListener("load", () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (response.error) {
            throw response.error;
          } else {
            if (response.hasOwnProperty("result")) {
              if (response.result) {
                if (
                  action !== "addNote" &&
                  action !== "sync" &&
                  action !== "version"
                ) {
                  saveChanges(action + "Saved", response.result);
                }

                resolve(response.result);
              } else {
                throw response.error;
              }
            } else {
              reject("failed to get results from AnkiConnect");
            }
          }
        } catch (e) {
          reject(e);
        }
      });

      xhr.open("POST", "http://localhost:8765");
      var sendData = JSON.stringify({
        action,
        version,
        params,
      });

      xhr.send(sendData);
      // debugLog(sendData);
    }
  });
}

function notifyUser(notifyContent, notificationType) {
  var notifyString = JSON.stringify(notifyContent);

  if (
    notificationType === "notifyalert" ||
    notificationType === "notifyAlert"
  ) {
    try {
      createNotification(notifyString);
    } catch (err) {
      alert(notifyString);
    }
  } else if (notificationType === "alert") {
    alert(notifyString);
  } else if (notificationType === "notify") {
    createNotification(notifyString);
  }
}

function createNotification(notificationTitle) {
  var manifestName;
  var manifestVersion;

  if (!isValidValue(manifestName)) {
    manifestName = "Anki Quick Adder";
  } else {
    manifestName = manifest.name;
  }
  if (!isValidValue(manifestVersion)) {
    manifestVersion = manifest.version;
  } else {
    manifestVersion = "1.00";
  }
  chrome.notifications.create(
    "ankiQuickAdder",
    {
      type: "basic",
      iconUrl: "icon-64.png",
      title: manifestName + " " + manifestVersion,
      message: notificationTitle,
    },
    function () {}
  );
}

function findRegex(findWhat, errorz) {
  let attributes = "gi";
  let txtToFind = new RegExp(findWhat, attributes);

  if (!findWhat) {
    return false;
  } else if (typeof errorz === "undefined" || errorz === null) {
    return false;
  } else {
    if (errorz.match) {
      if (errorz.match(txtToFind)) {
        return true;
      }
    } else {
      return false;
    }
  }
}

function restore_defaults() {
  if (typeof allSettings == "undefined") {
    allSettings = {};
  }
  currentNoteType = null;
  currentFields = null;
  currentDeck = null;
  savedDialogFields = null;
  allSettings.debugStatus = 0;
  allSettings.syncFrequency = "Manual";
  allSettings.forcePlainText = true;
  allSettings.cleanPastedHTML = true;
  allSettings.saveNotes = true;
  allSettings.stickyFields = true;
  allSettings.favouriteDeckMenu = 0;
  allSettings.favouriteModelMenu = 0;
  allSettings.removeDuplicateNotes = false;

  saveChanges("allSettings", allSettings);
}

document.addEventListener("DOMContentLoaded", restore_options);

//updated
function isUpdatedNow(openUrl = 0) {
  createContextMenu();
  if (openUrl === 1) {
    chrome.tabs.create(
      {
        url: "https://memor.ai/",
      },
      function (tab) {
        debugLog("update tab launched");
      }
    );
  }
}

//installed defaults
function isInstalledNow() {
  restore_defaults();
  var win = window.open(
    "popup.html",
    "extension_popup",
    "width=300,height=400,status=no,scrollbars=yes,resizable=no"
  );

  setTimeout(function () {
    win.close();
  }, 2000);

  chrome.tabs.create(
    {
      url: "https://memor.ai/",
    },
    function (tab) {
      debugLog("install tab launched");
    }
  );
}

chrome.extension.onConnect.addListener(function (port) {
  port.onMessage.addListener(function (msg) {
    debugLog("message recieved" + msg);
    if (msg === "reloadContextMenu") {
      restore_options();
      updateContextMenu();
    }
  });
});

function restore_options() {
  getChanges("connectionStatus");
  getChanges("favourites");
  getChanges("deckNamesSaved");
  getChanges("currentDeck");
  getChanges("currentNoteType");
  getChanges("currentFields");
  getChanges("savedFormFields", "local");
  getChanges("storedFieldsForModels");
  getChanges("modelNamesSaved");
  getChanges("getTagsSaved");
  getChanges("allSettings"); //default
  getChanges("allSavedNotes");
  getChanges("stickyFields");
  getChanges("stickyTags", "local");
}

chrome.contextMenus.onClicked.addListener(function (clickedData) {
  var currentItem = clickedData.menuItemId;

  if (clickedData.selectionText) {
    //add to back
    if (currentItem.indexOf("secretFieldKey12z-") >= 0) {
      var currentFieldName = currentItem.replace(/secretFieldKey12z-/gi, "");
      debugLog(savedFormFields);
      var fieldNumber = currentFields.indexOf(currentFieldName);
      if (allSettings.appendModeSettings == 1) {
        if (isValidValue(savedFormFields[fieldNumber])) {
          savedFormFields[fieldNumber] =
            savedFormFields[fieldNumber] + "<br>" + clickedData.selectionText;
        } else {
          savedFormFields[fieldNumber] = clickedData.selectionText;
        }
      } else {
        savedFormFields[fieldNumber] = clickedData.selectionText;
      }
    }
    saveChanges("savedFormFields", savedFormFields, "local");
  }

  if (
    currentItem === "ankiRecoverMenu" ||
    currentItem === "ankiRecoverSubMenu"
  ) {
    updateContextMenu();
  }
  if (currentItem.indexOf("ClearAllItems") >= 0) {
    clearStickySettings("all");
  }
  if (currentItem.indexOf("clearFieldKey12z-") >= 0) {
    let fieldToClear = currentItem.replace(/clearFieldKey12z-/gi, "");
    var indexFieldToClear = currentFields.indexOf(fieldToClear);
    savedFormFields[indexFieldToClear] = "";
    saveChanges("savedFormFields", savedFormFields, "local");
  }
  //workaround for updating deck through context menu.
  if (currentItem.indexOf("secretDeckKey12z") >= 0) {
    var currentdeckName = currentItem.replace(/secretDeckKey12z-/gi, "");
    saveChanges("currentDeck", currentdeckName);
  }

  if (currentItem.indexOf("secretModelKey12z") >= 0) {
    var currentModelName = currentItem.replace(/secretModelKey12z-/gi, "");

    saveChanges("currentNoteType", currentModelName);
    currentNoteType = currentModelName;

    if (storedFieldsForModels.hasOwnProperty(currentModelName)) {
      saveChanges("currentFields", storedFieldsForModels[currentModelName]);
    } else {
    }
  }
  //        workaround for submitting through chrome menu
  if (currentItem === "ankiSubmit") {
    submitToAnki();
  }
});

function isValidValue(value) {
  if (value === null || typeof value === "undefined") {
    return false;
  } else {
    return true;
  }
}

function getTagsArray(tagsString) {
  if (typeof tagsString === "string") {
    tagsString = tagsString.replace(/\,+\s+$|\,+$/, "");

    return tagsString.split(",");
  }
}

function getCurrentTags() {
  let currentTags = [];
  if (isValidValue(stickyTags)) {
    currentTags = stickyTags.replace(/;/g, ",");
    currentTags = getTagsArray(currentTags);
  }
  return currentTags;
}

function submitToAnki() {
  // saveChanges("savedFormFields", savedFormFields, "local");
  let params = null;
  if (isValidValue(currentFields)) {
    let currentTags = getCurrentTags();
    console.log(currentTags);
    var counter = 0;
    var arrayToSend = {};
    var sendValue;
    $.each(currentFields, function (index, value) {
      try {
        var textfieldValue = savedFormFields[index];
        if (isTextFieldValid(textfieldValue)) {
          sendValue = textfieldValue;
          counter++;
        } else {
          sendValue = "";
        }
      } catch (error) {
        sendValue = "";
        notifyUser(
          "Please edit your card. Can't parse ID" + value,
          "notifyalert"
        );
      }

      arrayToSend[value] = sendValue;
    });

    params = {
      note: {
        deckName: currentDeck,
        modelName: currentNoteType,
        fields: arrayToSend,
        tags: currentTags,
      },
    };
    if (counter === 0) {
      if (connectionStatus === false) {
        notifyUser("Can't connect to Anki. Please check it", "notifyAlert");
      } else {
        notifyUser("All fields are empty", "notifyAlert");
      }
    } else if (allSettings.saveNotes === "trueLocal") {
      let valueToStore = JSON.stringify(params);
      saveNotesLocally(valueToStore);
    } else {
      ankiConnectRequest("addNote", 6, params)
        .then(function (fulfilled) {
          notifyUser("Note is added to Anki succesfully.", "notifyalert");
          chrome.runtime.sendMessage({
            msg: "noteAdded",
            data: "",
          });
          clearStickySettings();
          clearStickyTags();
        })
        .catch(function (error) {
          {
            //notification for error
            var currentError = JSON.stringify(error);
            if (findRegex("Note is duplicate", currentError)) {
              if (allSettings.stickyFields === true) {
                notifyUser(
                  "Duplicate Note. Please change main field or disable sticky fields or use clear all in Menu",
                  "notifyalert"
                );
              } else {
                notifyUser(
                  "This is a duplicate Note. Please change main field.",
                  "notifyalert"
                );
              }
            } else if (findRegex("Collection was not found", currentError)) {
              notifyUser("Collection was not found", "notifyalert");
            } else if (findRegex("Note was empty", currentError)) {
              notifyUser("Note or front field was empty", "notifyalert");
            } else if (findRegex("Model was not found", currentError)) {
              notifyUser(
                "Model was not found.Please create model:" + currentNoteType,
                "notifyalert"
              );
            } else if (findRegex("Deck was not found", currentError)) {
              notifyUser(
                "Deck was not found.Please create Deck:" + currentDeck,
                "notifyalert"
              );
            } else if (
              findRegex("failed to connect to AnkiConnect", currentError)
            ) {
              //defaults save Notes
              if (!isValidValue(allSettings.saveNotes)) {
                allSettings.saveNotes = true;
                saveChanges("allSettings", allSettings);
              }

              if (allSettings.saveNotes === true) {
                let valueToStore = JSON.stringify(params);
                saveNotesLocally(valueToStore);
              } else {
                notifyUser(
                  "No connection.Turn on settings-> saveNotes to save in LocalStorage ",
                  "notifyalert"
                );
              }
            } else {
              notifyUser("Error: " + error, "notifyalert");
            }
          }
        });
    }
  }
}

function clearStickyTags() {
  if (allSettings.stickyTags !== true) {
    stickyTags = "";
    removeSettings("stickyTags", "local");
  } else {
  }
}

function saveNotesLocally(value) {
  if (allSavedNotes.indexOf(value) != "-1") {
    notifyUser("Note is already Saved in local list.", "notifyalert");
  } else {
    allSavedNotes.push(value);

    notifyUser("Note Saved to storage successfully", "notifyalert");
    saveChanges("allSavedNotes", allSavedNotes);
    clearStickySettings();

    clearStickyTags();
  }
}

function clearStickySettings(type = "single") {
  if (type === "all" || allSettings.stickyFields !== true) {
    savedFormFields = [];
  } else {
    if (!isValidValue(stickyFields)) {
      stickyFields = {};
    }
    if (!(currentNoteType in stickyFields)) {
      stickyFields[currentNoteType] = {};
    }
    if (savedFormFields.length > 0) {
      for (let i = 0; i < savedFormFields.length; i++) {
        let checkKeyvalue = stickyFields[currentNoteType][currentFields[i]];
        if (checkKeyvalue === false || typeof checkKeyvalue == "undefined") {
          savedFormFields[i] = "";
        }
      }
    } else {
      savedFormFields = [];
    }
  }

  //default
  if (!isValidValue(allSettings.stickyFields)) {
    allSettings.stickyFields = true;
    saveChanges("allSettings", allSettings);
  }

  saveChanges("savedFormFields", savedFormFields, "local");
}

function updateContextMenu() {
  chrome.contextMenus.removeAll(function () {
    createContextMenu();
  });
}

function createRecoverMenu() {
  chrome.contextMenus.removeAll(function () {
    //Main Menu item
    var menuItem = {
      id: "ankiRecoverMenu",
      title: "Anki(Recover Menu)",
      contexts: ["selection", "all"],
    };

    chrome.contextMenus.create(menuItem);
  });
}

function createContextMenu() {
  //Main Menu item
  var menuItem = {
    id: "ankiAddWord",
    title: "Add to Anki",
    contexts: ["selection", "all"],
  };

  chrome.contextMenus.create(menuItem);

  //card input Fields :child->Main Menu
  $.each(currentFields, function (index, value) {
    var childItem = {
      parentId: "ankiAddWord",
      id: "secretFieldKey12z-" + value,
      title: "Add to " + value,
      contexts: ["selection"],
    };
    chrome.contextMenus.create(childItem);
  });
  //separator - child->Main Menu
  var separatorz = {
    id: "ankiSeparate",
    type: "separator",
    parentId: "ankiAddWord",
    contexts: ["selection"],
  };
  chrome.contextMenus.create(separatorz);

  //submit button  :child->Main Menu

  var submitMenu = {
    parentId: "ankiAddWord",
    id: "ankiSubmit",
    title: "Submit",
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(submitMenu);

  //clear button :child->main menu
  var ClearMenu = {
    parentId: "ankiAddWord",
    id: "ClearMenu",
    title: "Clear Field ->",
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(ClearMenu);

  $.each(currentFields, function (index, value) {
    var clearItem = {
      parentId: "ClearMenu",
      id: "clearFieldKey12z-" + value,
      title: "Clear " + value,
      contexts: ["selection", "all"],
    };
    chrome.contextMenus.create(clearItem);
  });
  var separatorClear = {
    id: "ankiSeparateClear",
    type: "separator",
    parentId: "ClearMenu",
    contexts: ["selection"],
  };
  chrome.contextMenus.create(separatorClear);
  var clearAllItems = {
    parentId: "ClearMenu",
    id: "ClearAllItems",
    title: "Clear All",
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(clearAllItems);

  //update deck menu :child->Main Menu
  debugLog("value is " + currentDeck);
  var currentDeckMenu = {
    parentId: "ankiAddWord",
    id: "ankiCurrentDeck",
    title: "Deck: " + filteredDeckName(currentDeck, "mainMenu"),
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(currentDeckMenu);

  //separator for ankiAddWord
  var separatorz2 = {
    id: "ankiSeparate2",
    type: "separator",
    parentId: "ankiAddWord",
    contexts: ["selection"],
  };
  chrome.contextMenus.create(separatorz2);
  //Decksublist :child->ankiCurrentDeck->
  let deckToSelect;

  if (allSettings.favouriteDeckMenu == 1 && favourites.deck.length > 0) {
    deckToSelect = favourites.deck;
  } else {
    deckToSelect = deckNamesSaved;
  }

  $.each(deckToSelect.sort(), function (index, value) {
    var textFieldValue;
    // var displayDeck = value.replace(/:/gi, ">");

    var childItem = {
      parentId: "ankiCurrentDeck",
      id: "secretDeckKey12z-" + value,
      title: filteredDeckName(value),
      contexts: ["selection", "all"],
    };
    chrome.contextMenus.create(childItem);
  });

  //Model menu

  var modelNameSliced;
  //update model menu :child->Main Menu
  if (currentNoteType.length > 20) {
    modelNameSliced = currentNoteType.slice(0, 20) + "...";
  } else {
    modelNameSliced = currentNoteType;
  }
  var currentModelMenu = {
    parentId: "ankiAddWord",
    id: "ankiCurrentModel",
    title: "Model: " + modelNameSliced,
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(currentModelMenu);
  let modelToSelect;

  if (allSettings.favouriteModelMenu == 1 && favourites.model.length > 0) {
    modelToSelect = favourites.model;
  } else {
    modelToSelect = modelNamesSaved;
  }
  $.each(modelToSelect.sort(), function (index, value) {
    var textFieldValue = value;

    var childItem = {
      parentId: "ankiCurrentModel",
      id: "secretModelKey12z-" + value,
      title: textFieldValue,
      contexts: ["selection", "all"],
    };
    chrome.contextMenus.create(childItem);
  });
  //separator for ankiAddWord
  var separatorz3 = {
    id: "ankiSeparate3",
    type: "separator",
    parentId: "ankiAddWord",
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(separatorz3);
  //Main Menu item
  var recoverMenuItem = {
    parentId: "ankiAddWord",
    id: "ankiRecoverSubMenu",
    title: "Recover or Refresh Menu",
    contexts: ["selection", "all"],
  };
  chrome.contextMenus.create(recoverMenuItem);
  debugLog("created menu successfully");
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    let storageChange = changes[key];
    debugLog("key:" + key + " new value below:");
    debugLog(storageChange.newValue);

    let settingsToSave = [
      "getTagsSaved",
      "deckNamesSaved",
      "modelNamesSaved",
      "savedFormFields",
      "allSavedNotes",
      "stickyFields",
      "stickyTags",
      "allSettings",
      "currentNoteType",
      "storedFieldsForModels",
    ];

    if (settingsToSave.indexOf(key) !== -1) {
      window[key] = storageChange.newValue;
    }
    //setting with validation

    if ("currentFields" === key) {
      if (isValidValue(deckNamesSaved) && isValidValue(modelNamesSaved)) {
        currentFields = storageChange.newValue;
        updateContextMenu();
      }
    }

    if ("stickyTags" === key) {
      if (isValidValue(storageChange.newValue)) {
        stickyTags = storageChange.newValue;
      }
    }

    if ("favourites" === key) {
      if (isValidValue(storageChange.newValue)) {
        favourites = storageChange.newValue;
        if (
          allSettings.favouriteDeckMenu == 1 ||
          allSettings.favouriteModelMenu == 1
        ) {
          chrome.contextMenus.removeAll(function () {
            debugLog("Creating all menu");
            createContextMenu();
          });
        }
      }
    }

    if ("currentDeck" === key) {
      if (isValidValue(storageChange.newValue)) {
        currentDeck = storageChange.newValue;
        debugLog("current Fields are" + currentFields);
        if (isValidValue(currentFields)) {
          updateContextMenu();
        }
      }
    }

    if ("connectionStatus" === key) {
      if (storageChange.newValue === false) {
        createRecoverMenu();
      } else if (
        storageChange.newValue === true &&
        storageChange.oldValue === false
      ) {
        chrome.contextMenus.removeAll(function () {
          debugLog("Creating all menu");
          createContextMenu();
        });
      }
    }
  }
});

function removeSettings(value, type = "sync") {
  if (!isValidValue(value)) {
    return false;
  } else {
    if (type === "local") {
      chrome.storage.local.remove(value, function (Items) {
        debugLog("Local settings removed" + value);
      });
    } else {
      chrome.storage.sync.remove(value, function (Items) {
        debugLog("settings removed" + value);
      });
    }
  }
}

function filteredDeckName(value, type = "subMenu") {
  if (value.indexOf("::") !== -1) {
    var stringLength = value.substring(0, value.lastIndexOf("::") + 2).length;
    var last = value.substring(value.lastIndexOf("::") + 2, value.length);
    var spaceLength = stringLength - 10 > 5 ? stringLength - 10 : "5";
    if (type == "mainMenu") {
      return last;
    } else {
      return "\xA0".repeat(spaceLength) + last;
    }
  } else {
    return value;
  }
}

function saveChanges(key, value, type = "sync") {
  // Check that there's some code there.
  if (!value) {
    debugLog("Error: No value specified for" + key);
    return;
  }

  if (type === "sync") {
    // Save it using the Chrome extension storage API.
    chrome.storage.sync.set(
      {
        [key]: value,
      },
      function () {
        let error = chrome.runtime.lastError;
        if (error) {
          if (allSettings.debugStatus === 1) {
            notifyUser(
              "Can't save" + key + JSON.stringify(error),
              "error,text,3000"
            );
          }
        }
        //TODO: show to use for saved settings..
        debugLog("Settings saved for" + key + " and val below");
        debugLog(value);
      }
    );
  } else if (type === "local") {
    // Save it using the Chrome extension storage API.
    chrome.storage.local.set(
      {
        [key]: value,
      },
      function () {
        var error = chrome.runtime.lastError;
        if (error) {
          if (allSettings.debugStatus === 1) {
            notifyUser(
              "Can't save" + key + JSON.stringify(error),
              "error,text,3000"
            );
          }
        }
        //TODO: show to use for saved settings..
        debugLog("Settings saved for" + key + " and val below");
        debugLog(value);
      }
    );
  }
}

function isTextFieldValid(value) {
  if (value) {
    if (value === "<p><br></p>" || value === "<p></p>" || value === "<br>") {
      return false;
    } else {
      return true;
    }
  } else {
    return false;
  }
}

function getChanges(key, type = "sync") {
  var valueReturn;

  if (type == "sync") {
    chrome.storage.sync.get([key], function (result) {
      // debugLog('Value currently is ' + result[key]');
      valueReturn = result[key];
      if (typeof valueReturn != "undefined") {
        setValue(key, valueReturn);
      } else {
        debugLog(key + " is undefined or" + valueReturn);
      }
    });
  } else if (type == "local") {
    chrome.storage.local.get([key], function (result) {
      // debugLog('Value currently is ' + result[key]');
      valueReturn = result[key];
      if (typeof valueReturn != "undefined") {
        setValue(key, valueReturn);
      } else {
        debugLog(key + " is undefined or" + valueReturn);
      }
    });
  }
  // chrome.storage.sync.get(null, function (data) { console.info(data) });
}

function setValue(key, valueReturn) {
  //cases for old settings
  if (valueReturn === "true") window[key] = true;
  else if (valueReturn === "false") window[key] = false;
  else if (valueReturn === "0") window[key] = 0;
  else if (valueReturn === "1") window[key] = 1;
  else window[key] = valueReturn;

  debugLog(key + " and value below");
  debugLog(valueReturn);
  debugLog("----------");
}

debugLog = (function (undefined) {
  var debugLog = Error; // does this do anything?  proper inheritance...?
  debugLog.prototype.write = function (args) {
    /// * https://stackoverflow.com/a/3806596/1037948

    var suffix = {
      "@": this.lineNumber
        ? this.fileName + ":" + this.lineNumber + ":1" // add arbitrary column value for chrome linking
        : extractLineNumberFromStack(this.stack),
    };

    args = args.concat([suffix]);
    // via @paulirish console wrapper
    if (console && console.log) {
      if (console.log.apply) {
        console.log.apply(console, args);
      } else {
        console.log(args);
      } // nicer display in some browsers
    }
  };
  var extractLineNumberFromStack = function (stack) {
    if (!stack) return "?"; // fix undefined issue reported by @sigod

    // correct line number according to how Log().write implemented
    var line = stack.split("\n")[2];
    // fix for various display text
    line =
      line.indexOf(" (") >= 0
        ? line.split(" (")[1].substring(0, line.length - 1)
        : line.split("at ")[1];
    return line;
  };

  return function (params) {
    // only if explicitly true somewhere
    if (
      typeof allSettings.debugStatus === typeof undefined ||
      allSettings.debugStatus === 0
    )
      return;

    // call handler extension which provides stack trace
    debugLog().write(Array.prototype.slice.call(arguments, 0)); // turn into proper array
  }; //--  fn  returned
})(); //--- _debugLog
