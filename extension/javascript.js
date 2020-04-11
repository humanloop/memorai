/*jshint esversion: 6 */
var availableTags;
var currentDeck;
var currentFields;
var currentTags;
var currentNoteType;
var savedFormFields = savedFormFields || [];
var connectionStatus;
var deckNamesSaved;
var modelNamesSaved;
var storedFieldsForModels = storedFieldsForModels || {};
var onceTimeForceSync;
var favourites = {};
var editor;
var allSavedNotes = [];
var savedDialogFields = [];
var allSettings = {};
var currentNoteNumber;
var editingCard = false;
var currentDialogType;
var stickyFields = {};
var themeMode = "day";
var stickyTags = "";
var port = chrome.extension.connect({
  name: "ankiadder",
});

chrome.runtime.sendMessage({
  action: "wakeup",
});

chrome.runtime.onMessage.addListener(function (request) {
  if (request.msg === "addedFields") {
    //  To do something
    savedFormFields = request.data;
    restore_All_Fields(storedFieldsForModels[currentNoteType], currentNoteType);
  } else if (request.msg === "noteAdded") {
    clearTextBoxes("backgroundAll");
  }
});

function load_options() {
  getChanges("allSettings"); //default
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
  getChanges("allSavedNotes");
  getChanges("stickyFields");
  getChanges("stickyTags", "local");
}

//Restore User Settings on load of page
document.addEventListener("DOMContentLoaded", load_options);

var deckNames = function () {
  background
    .ankiConnectRequest("deckNames", 6)
    .then(function (fulfilled) {
      let counter = 0;
      $.each(fulfilled.sort(), function (key, value) {
        //cleaning names
        var textFieldValue = cleanedDeckName(value);

        if (value === currentDeck) {
          counter++;
          $("#deckList").append(
            $("<option></option>")
              .attr("value", value)
              .attr("selected", "selected")
              .text(textFieldValue)
          );
        } else {
          counter++;
          $("#deckList").append(
            $("<option></option>").attr("value", value).text(textFieldValue)
          );
        }

        $("#FavouriteDeck").append(
          $("<option></option>").attr("value", value).text(textFieldValue)
        );

        $("#dialogDeckList").append(
          $("<option></option>").attr("value", value).text(textFieldValue)
        );
      });

      if (!isValidValue(currentDeck) || counter === 1) {
        //Deal with errors
        var value = $("#deckList").find("option:first-child").val();
        $("#deckList option:eq(0)").attr("selected", "selected");
        currentDeck = value;
        saveChanges("currentDeck", value);
      }
    })
    .catch(function (error) {
      saveChanges("connectionStatus", false);
      let syncSettingsNotice;
      let conRefusedError;
      let syncMode = allSettings.syncFrequency;
      if (syncMode !== "Manual") {
        if (isValidValue(modelNamesSaved) && isValidValue(deckNamesSaved)) {
          conRefusedError =
            "<p>Connection Refused</p>" +
            "This extension needs Anki to sync fields in Live Mode.</a>";

          syncSettingsNotice =
            "<br><br>  " +
            "<span id='syncSettingSpan'>It is preferred to turn on " +
            "<input type='button' id='syncSettingsButton' value='Turn on Cache'> to use cached fields and save notes locally.</span>";
        } else {
          conRefusedError =
            "<p>Connection Refused and no cached data.</p>1. This extension needs <a href='https://apps.ankiweb.net' target='_blank'>Anki.</a> <br>2. Also, please install <a href='https://ankiweb.net/shared/info/2055492159' target='_blank'> Anki connect plugin (V6).</a> (if not installed).<br><br><a href='https://codehealthy.com/chrome-anki-quick-adder/#getting-started' target='_blank'>Read documentation</a><br><input type='button' id='reloadExtension' value='Reload'>";
        }
      } else {
        //handle case when data is already saved..
        if (isValidValue(modelNamesSaved) && isValidValue(deckNamesSaved)) {
          init();
        } else {
          conRefusedError =
            "<p>Connection Refused and no cached data.</p>1. This extension needs <a href='https://apps.ankiweb.net' target='_blank'>Anki.</a> <br>2. Also, please install <a href='https://ankiweb.net/shared/info/2055492159' target='_blank'> Anki connect plugin (V6).</a> (if not installed).<br><br><a href='https://codehealthy.com/chrome-anki-quick-adder/#getting-started' target='_blank'>Read documentation</a><br>";
          syncSettingsNotice = "";
        }
      }

      if (syncSettingsNotice) {
        errorLogs.innerHTML = conRefusedError + syncSettingsNotice + "";
      } else {
        errorLogs.innerHTML = conRefusedError;
      }

      debugLog(error);
    });
};

var modelNames = function () {
  background
    .ankiConnectRequest("modelNames", 6)
    .then(function (fulfilled) {
      var counter = 0;
      $.each(fulfilled.sort(), function (key, value) {
        if (value === currentNoteType) {
          counter++;
          $("#modelList").append(
            $("<option></option>")
              .attr("value", value)
              .attr("selected", "selected")
              .text(value)
          );
        } else {
          counter++;

          $("#modelList").append(
            $("<option></option>").attr("value", value).text(value)
          );
        }

        //    create favs

        $("#FavouriteModel").append(
          $("<option></option>").attr("value", value).text(value)
        );

        $("#dialogModelList").append(
          $("<option></option>").attr("value", value).text(value)
        );
      });

      if (!isValidValue(currentNoteType) || counter === 1) {
        // if(counter==1)
        // {
        //     selectFirstElement("#modelList");
        // }
        var value = $("#modelList").find("option:first-child").val();

        $("#modelList option:eq(0)").attr("selected", "selected");
        currentNoteType = value;
        saveChanges("currentNoteType", value);
        cardFields(value);
      } else {
        cardFields(currentNoteType);
      }

      for (let item in fulfilled) {
        if (storedFieldsForModels.hasOwnProperty(fulfilled[item])) {
        } else {
          cardFields(fulfilled[item], "all");
        }
      }
    })
    .catch(function (error) {
      //Handle Error

      debugLog(error);
    });
};

var getTags = function () {
  background
    .ankiConnectRequest("getTags", 6)
    .then(function (fulfilled) {
      loadAutoCompleteTags("main", "#tags", fulfilled);
    })
    .catch(function (error) {
      // log error
      debugLog(error.message);
    });
};

var cardFields = function (item, typeSync = "single") {
  if (
    storedFieldsForModels.hasOwnProperty(item) &&
    allSettings.syncFrequency !== "Live"
  ) {
    if (typeSync === "single") {
      currentFields = storedFieldsForModels[item];
      saveChanges("currentFields", storedFieldsForModels[item]);
      restore_All_Fields(storedFieldsForModels[item], item);
    }

    errorLogs.innerHTML = "";
  } else {
    var params = {
      modelName: item,
    };
    //debugLog(params);
    background
      .ankiConnectRequest("modelFieldNames", 6, params)
      .then(function (fulfilled) {
        if (typeSync === "single") {
          currentFields = fulfilled;
          saveChanges("currentFields", fulfilled);

          storedFieldsForModels[item] = fulfilled;
          saveChanges("storedFieldsForModels", storedFieldsForModels);

          restore_All_Fields(fulfilled, item);
        } else {
          storedFieldsForModels[item] = fulfilled;
          saveChanges("storedFieldsForModels", storedFieldsForModels);
        }
      })
      .catch(function (error) {
        saveChanges("connectionStatus", false);

        if (background.findRegex("failed to connect", error)) {
          if (typeSync === "all") {
          } else {
            // $('#addCard').empty();
            if (!isValidValue(item)) {
              item = "card";
            }
            $("#addCard").html(
              '<p><span style="color:red;">No connection!!</span> <br><span style="color:#0000ff;">fields of ' +
                item +
                "</span> were not cached yet.<br><br>Run Anki once and click <input type='button' id='reloadExtension' value='Reload'> to reload extension popup.</p>"
            );

            debugLog(error);
          }
        } else if (error === null) {
          $("#addCard").empty();
          $("#addCard").html(
            '<p><span style="color:red;">Model ' +
              currentNoteType +
              " is deleted in Anki.Create it or <input type='button' id='deleteModelFromCache' class='deleteModel' value='delete From cache'></span></p>"
          );
        } else {
          $("#addCard").empty();
          $("#addCard").html(
            "<p><span style=\"color:red;\">Model type not found. Please create it and refresh cache</span></p><input type='button' id='refreshData' class='refreshModel' style=' background-color:#ffa500; 'value='Refresh Models'>"
          );
        }
      });
  }
};

function delayKey(callback, ms) {
  var timer = 0;
  return function () {
    var context = this,
      args = arguments;
    clearTimeout(timer);
    timer = setTimeout(function () {
      callback.apply(context, args);
    }, ms || 0);
  };
}

function getButtonFor(tags, elementId, iconName, imageTitle) {
  return (
    '<button type="button" ' +
    'style="background-color:white;' +
    'border:none;" ' +
    'class="' +
    iconName +
    '" id="' +
    elementId +
    '">\n' +
    '<img src="images/' +
    iconName +
    '.png" alt="icon" title="' +
    imageTitle +
    '" ">\n' +
    "  </button></p>\n"
  );
}

function setSaveTagsListener() {
  $("#tags").on("change paste", function () {
    let tagsToSave = $("#tags").val();
    saveChanges("stickyTags", tagsToSave, "local");
  });

  $("#tags").on(
    "keyup",
    delayKey(function (e) {
      let tagsToSave = $("#tags").val();
      saveChanges("stickyTags", tagsToSave, "local");
    }, 500)
  );
}

function loadSavedTagsIntoTagsField() {
  if (isValidValue(stickyTags) && stickyTags.length > 0) {
    $("#tags").val(stickyTags);
  }
}

function loadTagsIcon() {
  let stickTagsButton = $("#stickyTagsButton img");
  if (allSettings.stickyTags == false) {
    stickTagsButton.attr("src", "images/sOff.png");
    stickTagsButton.attr(
      "title",
      "Turning on will prevent tags from being cleared on clicking add note."
    );
  } else {
    stickTagsButton.attr("src", "images/sOn.png");
    stickTagsButton.attr(
      "title",
      "Turning OFF means tags will be cleared on clicking add note"
    );
  }

  saveChanges("stickyTags", stickyTags, "local");
}

function toggleStickyTagsIcon() {
  if (allSettings.stickyTags == true) {
    allSettings.stickyTags = false;
  } else {
    allSettings.stickyTags = true;
  }
  loadTagsIcon();
}

function setTagButtonToggleListener() {
  $("#stickyTagsButton").on("click", function () {
    toggleStickyTagsIcon();
    saveSettings("stickyTags", allSettings.stickyTags);
  });
}

function init() {
  chrome.runtime.getBackgroundPage(function (background) {
    window.background = background;

    validateSettings();
    //grab deck names
    deckNames();
    // Fields names are retrieved inside modelNames()
    modelNames();
    //Tags for AutoComplete
    getTags();
    loadTagsIcon();
    loadSavedTagsIntoTagsField();
    setSaveTagsListener();
    // select default sync hide and show
    setTagButtonToggleListener();
    savedNotesLoad();
    notifyJsStyles();
  });
}

function loadAutoCompleteTags(context, field, data) {
  //sanitize Tags

  availableTags = [];

  for (let i = 0; i < data.length; i++) {
    let filterTag = data[i].replace(/\,+\s+$|\,+$/, "").trim();
    let filterTagArr = filterTag.split(",");
    if (filterTagArr.length > 0) {
      for (let j = 0; j < filterTagArr.length; j++) {
        let multipleTag = filterTagArr[j].trim();
        if (availableTags.indexOf(multipleTag) === -1) {
          availableTags.push(multipleTag);
        }
      }
    } else {
      if (availableTags.indexOf(filterTag) === -1) {
        availableTags.push(filterTag);
      }
    }
  }

  function split(val) {
    return val.split(/;\s*/);
  }

  function extractLast(term) {
    return split(term).pop();
  }

  $(field)
    // don't navigate away from the field on tab when selecting an item
    .on("keydown", function (event) {
      if (
        event.keyCode === $.ui.keyCode.TAB &&
        $(this).autocomplete("instance").menu.active
      ) {
        event.preventDefault();
      }
    })
    .autocomplete({
      minLength: 0,
      source: function (request, response) {
        // delegate back to autocomplete, but extract the last term
        response(
          $.ui.autocomplete.filter(availableTags, extractLast(request.term))
        );
      },
      focus: function () {
        // prevent value inserted on focus
        return false;
      },
      select: function (event, ui) {
        var terms = split(this.value);
        // remove the current input
        terms.pop();
        // add the selected item
        terms.push(ui.item.value);
        // add placeholder to get the comma-and-space at the end
        terms.push("");
        this.value = terms.join("; ");
        $("#tags").trigger("change");
        return false;
      },
    });
}

function validateSettings() {
  if (!isValidValue(allSettings)) {
    allSettings = {};
  }
  if (!isValidValue(allSettings.debugStatus)) {
    allSettings.debugStatus = 0;
  }
  if (!isValidValue(allSettings.appendModeSettings)) {
    allSettings.appendModeSettings = 1;
  }
  if (!isValidValue(allSettings.syncFrequency)) {
    allSettings.syncFrequency = "Manual";
  }
  if (!isValidValue(allSettings.favouriteDeckMenu)) {
    allSettings.favouriteDeckMenu = "0";
  }
  if (!isValidValue(allSettings.favouriteModelMenu)) {
    allSettings.favouriteModelMenu = "0";
  }

  if (!isValidValue(allSettings.syncFrequency)) {
    allSettings.forcePlainText = true;
  }
  if (!isValidValue(allSettings.cleanPastedHTML)) {
    allSettings.cleanPastedHTML = true;
  }
  if (!isValidValue(allSettings.saveNotes)) {
    allSettings.saveNotes = true;
  }
  if (!isValidValue(allSettings.stickyFields)) {
    allSettings.stickyFields = true;
  }
  if (!isValidValue(allSettings.removeDuplicateNotes)) {
    allSettings.removeDuplicateNotes = true;
  }

  if (!isValidValue(allSettings.stickyTags)) {
    allSettings.stickyTags = true;
  }

  saveChanges("allSettings", allSettings);
}

function selectEditDialogOptions(DialogValueToSelect, whatElement) {
  var value = $(whatElement)
    .find('option[value="' + DialogValueToSelect + '"]')
    .val();

  if (value) {
    $(whatElement + ' option[selected="selected"]').each(function () {
      $(this).removeAttr("selected");
    });

    $(whatElement).val(DialogValueToSelect).change();
    // currentDeck = value;
  }
}

function createDialogFields(localFields, noteType) {
  $("#dialogAddCard").empty();
  for (let key in localFields) {
    let localFieldValue;
    if (noteType === "Edit" || noteType === "Add") {
      if (localFields[key] !== null) {
        localFieldValue = localFields[key]
          .replace(/<p><\/p>/gi, "<br>")
          .replace(/<p><br><\/p>/gi, "<br>");
      } else {
        localFieldValue = "";
      }

      $("#dialogAddCard").append(
        '<label for="' +
          key +
          '-Field">' +
          key +
          '</label><textarea class="fieldsToMaintain dialogFields" id="dialog-' +
          key +
          '-Field" name="' +
          key +
          '">' +
          localFieldValue +
          "</textarea><br>"
      );
    } else {
      $("#dialogAddCard").append(
        '<label for="' +
          key +
          '-Field">' +
          key +
          '</label><textarea class="fieldsToMaintain dialogFields" id="dialog-' +
          key +
          '-Field" name="' +
          key +
          '"></textarea><br>'
      );
    }
  }
  //clear Tags

  createDynamicFields();
}

function notifyJsStyles() {
  $.notify.addStyle("bootstrap-html", {
    html: "<div>\n<span data-notify-html></span>\n</div>",
    classes: {
      base: {
        "font-weight": "bold",
        padding: "8px 15px 8px 14px",
        "text-shadow": "0 1px 0 rgba(255, 255, 255, 0.5)",
        "background-color": "#fcf8e3",
        border: "1px solid #fbeed5",
        "border-radius": "4px",
        "white-space": "nowrap",
        "padding-left": "25px",
        "background-repeat": "no-repeat",
        "background-position": "3px 7px",
      },
      error: {
        color: "#B94A48",
        "background-color": "#F2DEDE",
        "border-color": "#EED3D7",
        "background-image":
          "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAtRJREFUeNqkVc1u00AQHq+dOD+0poIQfkIjalW0SEGqRMuRnHos3DjwAH0ArlyQeANOOSMeAA5VjyBxKBQhgSpVUKKQNGloFdw4cWw2jtfMOna6JOUArDTazXi/b3dm55socPqQhFka++aHBsI8GsopRJERNFlY88FCEk9Yiwf8RhgRyaHFQpPHCDmZG5oX2ui2yilkcTT1AcDsbYC1NMAyOi7zTX2Agx7A9luAl88BauiiQ/cJaZQfIpAlngDcvZZMrl8vFPK5+XktrWlx3/ehZ5r9+t6e+WVnp1pxnNIjgBe4/6dAysQc8dsmHwPcW9C0h3fW1hans1ltwJhy0GxK7XZbUlMp5Ww2eyan6+ft/f2FAqXGK4CvQk5HueFz7D6GOZtIrK+srupdx1GRBBqNBtzc2AiMr7nPplRdKhb1q6q6zjFhrklEFOUutoQ50xcX86ZlqaZpQrfbBdu2R6/G19zX6XSgh6RX5ubyHCM8nqSID6ICrGiZjGYYxojEsiw4PDwMSL5VKsC8Yf4VRYFzMzMaxwjlJSlCyAQ9l0CW44PBADzXhe7xMdi9HtTrdYjFYkDQL0cn4Xdq2/EAE+InCnvADTf2eah4Sx9vExQjkqXT6aAERICMewd/UAp/IeYANM2joxt+q5VI+ieq2i0Wg3l6DNzHwTERPgo1ko7XBXj3vdlsT2F+UuhIhYkp7u7CarkcrFOCtR3H5JiwbAIeImjT/YQKKBtGjRFCU5IUgFRe7fF4cCNVIPMYo3VKqxwjyNAXNepuopyqnld602qVsfRpEkkz+GFL1wPj6ySXBpJtWVa5xlhpcyhBNwpZHmtX8AGgfIExo0ZpzkWVTBGiXCSEaHh62/PoR0p/vHaczxXGnj4bSo+G78lELU80h1uogBwWLf5YlsPmgDEd4M236xjm+8nm4IuE/9u+/PH2JXZfbwz4zw1WbO+SQPpXfwG/BBgAhCNZiSb/pOQAAAAASUVORK5CYII=)",
      },
      success: {
        color: "#468847",
        "background-color": "#DFF0D8",
        "border-color": "#D6E9C6",
        "background-image":
          "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAutJREFUeNq0lctPE0Ecx38zu/RFS1EryqtgJFA08YCiMZIAQQ4eRG8eDGdPJiYeTIwHTfwPiAcvXIwXLwoXPaDxkWgQ6islKlJLSQWLUraPLTv7Gme32zoF9KSTfLO7v53vZ3d/M7/fIth+IO6INt2jjoA7bjHCJoAlzCRw59YwHYjBnfMPqAKWQYKjGkfCJqAF0xwZjipQtA3MxeSG87VhOOYegVrUCy7UZM9S6TLIdAamySTclZdYhFhRHloGYg7mgZv1Zzztvgud7V1tbQ2twYA34LJmF4p5dXF1KTufnE+SxeJtuCZNsLDCQU0+RyKTF27Unw101l8e6hns3u0PBalORVVVkcaEKBJDgV3+cGM4tKKmI+ohlIGnygKX00rSBfszz/n2uXv81wd6+rt1orsZCHRdr1Imk2F2Kob3hutSxW8thsd8AXNaln9D7CTfA6O+0UgkMuwVvEFFUbbAcrkcTA8+AtOk8E6KiQiDmMFSDqZItAzEVQviRkdDdaFgPp8HSZKAEAL5Qh7Sq2lIJBJwv2scUqkUnKoZgNhcDKhKg5aH+1IkcouCAdFGAQsuWZYhOjwFHQ96oagWgRoUov1T9kRBEODAwxM2QtEUl+Wp+Ln9VRo6BcMw4ErHRYjH4/B26AlQoQQTRdHWwcd9AH57+UAXddvDD37DmrBBV34WfqiXPl61g+vr6xA9zsGeM9gOdsNXkgpEtTwVvwOklXLKm6+/p5ezwk4B+j6droBs2CsGa/gNs6RIxazl4Tc25mpTgw/apPR1LYlNRFAzgsOxkyXYLIM1V8NMwyAkJSctD1eGVKiq5wWjSPdjmeTkiKvVW4f2YPHWl3GAVq6ymcyCTgovM3FzyRiDe2TaKcEKsLpJvNHjZgPNqEtyi6mZIm4SRFyLMUsONSSdkPeFtY1n0mczoY3BHTLhwPRy9/lzcziCw9ACI+yql0VLzcGAZbYSM5CCSZg1/9oc/nn7+i8N9p/8An4JMADxhH+xHfuiKwAAAABJRU5ErkJggg==)",
      },
      info: {
        color: "#3A87AD",
        "background-color": "#D9EDF7",
        "border-color": "#BCE8F1",
        "background-image":
          "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3QYFAhkSsdes/QAAA8dJREFUOMvVlGtMW2UYx//POaWHXg6lLaW0ypAtw1UCgbniNOLcVOLmAjHZolOYlxmTGXVZdAnRfXQm+7SoU4mXaOaiZsEpC9FkiQs6Z6bdCnNYruM6KNBw6YWewzl9z+sHImEWv+vz7XmT95f/+3/+7wP814v+efDOV3/SoX3lHAA+6ODeUFfMfjOWMADgdk+eEKz0pF7aQdMAcOKLLjrcVMVX3xdWN29/GhYP7SvnP0cWfS8caSkfHZsPE9Fgnt02JNutQ0QYHB2dDz9/pKX8QjjuO9xUxd/66HdxTeCHZ3rojQObGQBcuNjfplkD3b19Y/6MrimSaKgSMmpGU5WevmE/swa6Oy73tQHA0Rdr2Mmv/6A1n9w9suQ7097Z9lM4FlTgTDrzZTu4StXVfpiI48rVcUDM5cmEksrFnHxfpTtU/3BFQzCQF/2bYVoNbH7zmItbSoMj40JSzmMyX5qDvriA7QdrIIpA+3cdsMpu0nXI8cV0MtKXCPZev+gCEM1S2NHPvWfP/hL+7FSr3+0p5RBEyhEN5JCKYr8XnASMT0xBNyzQGQeI8fjsGD39RMPk7se2bd5ZtTyoFYXftF6y37gx7NeUtJJOTFlAHDZLDuILU3j3+H5oOrD3yWbIztugaAzgnBKJuBLpGfQrS8wO4FZgV+c1IxaLgWVU0tMLEETCos4xMzEIv9cJXQcyagIwigDGwJgOAtHAwAhisQUjy0ORGERiELgG4iakkzo4MYAxcM5hAMi1WWG1yYCJIcMUaBkVRLdGeSU2995TLWzcUAzONJ7J6FBVBYIggMzmFbvdBV44Corg8vjhzC+EJEl8U1kJtgYrhCzgc/vvTwXKSib1paRFVRVORDAJAsw5FuTaJEhWM2SHB3mOAlhkNxwuLzeJsGwqWzf5TFNdKgtY5qHp6ZFf67Y/sAVadCaVY5YACDDb3Oi4NIjLnWMw2QthCBIsVhsUTU9tvXsjeq9+X1d75/KEs4LNOfcdf/+HthMnvwxOD0wmHaXr7ZItn2wuH2SnBzbZAbPJwpPx+VQuzcm7dgRCB57a1uBzUDRL4bfnI0RE0eaXd9W89mpjqHZnUI5Hh2l2dkZZUhOqpi2qSmpOmZ64Tuu9qlz/SEXo6MEHa3wOip46F1n7633eekV8ds8Wxjn37Wl63VVa+ej5oeEZ/82ZBETJjpJ1Rbij2D3Z/1trXUvLsblCK0XfOx0SX2kMsn9dX+d+7Kf6h8o4AIykuffjT8L20LU+w4AZd5VvEPY+XpWqLV327HR7DzXuDnD8r+ovkBehJ8i+y8YAAAAASUVORK5CYII=)",
      },
      warn: {
        color: "#C09853",
        "background-color": "#FCF8E3",
        "border-color": "#FBEED5",
        "background-image":
          "url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAMAAAC6V+0/AAABJlBMVEXr6eb/2oD/wi7/xjr/0mP/ykf/tQD/vBj/3o7/uQ//vyL/twebhgD/4pzX1K3z8e349vK6tHCilCWbiQymn0jGworr6dXQza3HxcKkn1vWvV/5uRfk4dXZ1bD18+/52YebiAmyr5S9mhCzrWq5t6ufjRH54aLs0oS+qD751XqPhAybhwXsujG3sm+Zk0PTwG6Shg+PhhObhwOPgQL4zV2nlyrf27uLfgCPhRHu7OmLgAafkyiWkD3l49ibiAfTs0C+lgCniwD4sgDJxqOilzDWowWFfAH08uebig6qpFHBvH/aw26FfQTQzsvy8OyEfz20r3jAvaKbhgG9q0nc2LbZxXanoUu/u5WSggCtp1anpJKdmFz/zlX/1nGJiYmuq5Dx7+sAAADoPUZSAAAAAXRSTlMAQObYZgAAAAFiS0dEAIgFHUgAAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBgUBGhh4aah5AAAAlklEQVQY02NgoBIIE8EUcwn1FkIXM1Tj5dDUQhPU502Mi7XXQxGz5uVIjGOJUUUW81HnYEyMi2HVcUOICQZzMMYmxrEyMylJwgUt5BljWRLjmJm4pI1hYp5SQLGYxDgmLnZOVxuooClIDKgXKMbN5ggV1ACLJcaBxNgcoiGCBiZwdWxOETBDrTyEFey0jYJ4eHjMGWgEAIpRFRCUt08qAAAAAElFTkSuQmCC)",
      },
    },
  });
}

function savedNotesLoad() {
  var MyCustomDirectLoadStrategy = function (grid) {
    jsGrid.loadStrategies.PageLoadingStrategy.call(this, grid);
  };

  MyCustomDirectLoadStrategy.prototype = new jsGrid.loadStrategies.PageLoadingStrategy();

  MyCustomDirectLoadStrategy.prototype.finishDelete = function (
    deletedItem,
    deletedItemIndex
  ) {
    var grid = this._grid;
    grid.option("data").splice(deletedItemIndex, 1);
    grid.refresh();
  };
  MyCustomDirectLoadStrategy.prototype.finishInsert = function () {
    var grid = this._grid;

    grid.render();

    var pageSize = $("#jsGrid").jsGrid("option", "pageSize");
    var lastPage = Math.ceil(allSavedNotes.length / pageSize);
    $("#jsGrid").jsGrid("openPage", lastPage);
  };

  $("#jsGrid").jsGrid({
    width: "640px",

    filtering: false,
    editing: true,
    sorting: true,
    onItemDeleted: function (args) {
      allSavedNotes.splice(args.itemIndex, 1);
      saveChanges("allSavedNotes", allSavedNotes);
    },
    noDataContent: "No notes are saved",

    onItemUpdated: function (args) {},

    loadStrategy: function () {
      return new MyCustomDirectLoadStrategy(this);
    },

    autoload: true,
    paging: true,
    pageLoading: true,
    pageSize: 10,
    pageIndex: 1,

    rowClick: function (args) {
      currentNoteNumber = args.itemIndex;
      editingCard = true;
      showDetailsDialog("Edit", args.item);
    },
    rowClass: function (item, itemIndex) {
      return "saveNotesTable" + itemIndex;
    },

    // rowDoubleClick: function(args) {
    //     $("#detailsDialog").dialog("close");
    //     if(this.editing) {
    //         this.editItem($(args.event.target).closest("tr"));
    //     }
    //
    //
    //
    //     },

    deleteConfirm: function (item) {
      return 'The Note "' + item.allFields + '" will be removed. Are you sure?';
    },
    controller: {
      loadData: function (filter) {
        var returnedData = parseAndToObject(allSavedNotes);
        var startIndex = (filter.pageIndex - 1) * filter.pageSize;
        return {
          data: returnedData.data.slice(
            startIndex,
            startIndex + filter.pageSize
          ),
          itemsCount: allSavedNotes.length,
        };
      },
      insertItem: function (item) {},
    },
    fields: [
      {
        name: "firstField",
        type: "text",
        width: 100,
      },

      {
        name: "deckName",
        type: "text",
        width: 70,
        itemTemplate: function (value) {
          return cleanedDeckName(value).trim();
        },

        cleanedDeckName,
      },
      {
        name: "modelName",
        type: "text",
        width: 70,
      },
      {
        name: "allFields",
        type: "text",
        width: 150,
      },
      {
        name: "tags",
        type: "text",
        width: 70,
      },
      {
        type: "control",
        modeSwitchButton: false,
        editButton: false,
        headerTemplate: function () {
          return $("<button>")
            .attr("type", "button")
            .text("Add")
            .on("click", function () {
              showDetailsDialog("Add", {});
            });
        },
      },
      {
        name: "lasterror",
        type: "text",
        css: "dialogTableError",
        width: 60,
        itemTemplate: function (value) {
          return value;
        },
      },
    ],
  });

  $("#detailsDialog").dialog({
    autoOpen: false,
    height: 400,
    width: 350,
  });

  $("#dialogform1").submit(function (event) {
    event.preventDefault();
    formSubmitHandler();
  });
  var formSubmitHandler = $.noop;

  var showDetailsDialog = function (dialogType, editNote) {
    currentDialogType = dialogType;
    Mousetrap.reset();
    rebindAllKeys("dialogCard");

    if (dialogType === "Edit") {
      selectEditDialogOptions(editNote.deckName, "#dialogDeckList");
      selectEditDialogOptions(editNote.modelName, "#dialogModelList");
      createDialogFields(editNote.allHiddenFields, "Edit");
      let unfilteredTags = editNote.tags;
      let filteredTags = unfilteredTags.toString().replace(/\,/g, ";");

      $("#dialogTags").val(filteredTags);
    } else if (dialogType === "Add") {
      var allFieldsRetreived = {};
      var localNoteType;
      if (currentNoteType) {
        localNoteType = currentNoteType;
      } else if (isValidValue(favourites.model[0])) {
        localNoteType = favourites.model[0];
      } else {
        localNoteType = "";
      }
      selectEditDialogOptions(localNoteType, "#dialogModelList");
      for (let key in storedFieldsForModels[localNoteType]) {
        let fieldValue;
        if (savedDialogFields[key]) {
          fieldValue = savedDialogFields[key];
        } else {
          fieldValue = "";
        }
        allFieldsRetreived[
          storedFieldsForModels[localNoteType][key]
        ] = fieldValue;
      }

      createDialogFields(allFieldsRetreived, "Add");
      //    clear oldTags
      $("#dialogTags").val("");
    }
    //    load autocomplete for editCard and addCard
    loadAutoCompleteTags("main", "#dialogTags", availableTags);

    formSubmitHandler = function () {
      saveClient(editNote, dialogType === "Add");
    };

    $("#detailsDialog")
      .dialog("option", "title", dialogType + " Note")
      .dialog("open");
  };

  var saveClient = function (editNote, isNew) {
    //get updated fields and insert in list
    var allFields = "";
    //get keys
    var counter = 0;
    var tempFirstField;
    var newDeckList = $("#dialogDeckList").val();
    var newModeList = $("#dialogModelList").val();
    var newTag = $("#dialogTags").val().replace(/;/g, ",");
    var allHiddenFields = {};
    var saveNewNote;
    if (newModeList === null || newDeckList === null) {
      notifyDialog(
        "Model name or deck name is empty.<br> 1. Please run Anki <br>2. Go to Add card tab and click on refresh icon"
      );
      return false;
    }
    var textFieldEmptyCounter = 0;
    $("textarea[id^='dialog-']").each(function () {
      var textfieldId = $(this).attr("id");
      var textfieldValue = $(this).val();
      if (background.isTextFieldValid(textfieldValue)) {
        textFieldEmptyCounter++;
      }

      if (counter === 0) {
        tempFirstField = textfieldValue.slice(0, 30);

        counter++;
      }
      var key = textfieldId.replace(/dialog-/gi, "").replace(/-Field/gi, "");
      allHiddenFields[key] = textfieldValue;
      allFields = allFields + key + ": " + textfieldValue + " ";
    });

    if (textFieldEmptyCounter === 0) {
      notifyDialog("All Fields are empty");
      return false;
    }

    allFields =
      allFields.replace(/<(?:.|\n)*?>/gm, "").slice(0, 30) + "..........";

    var arrayToSend = allHiddenFields;
    saveNewNote = {
      note: {
        deckName: newDeckList,
        modelName: newModeList,
        fields: arrayToSend,
        tags: [newTag],
      },
    };

    let noteWithLastError = {};
    noteWithLastError = saveNewNote;
    noteWithLastError.lasterror = "";

    var newNoteValue = JSON.stringify(noteWithLastError);

    var found = allSavedNotes.indexOf(newNoteValue);

    if (found != "-1") {
      if (found != currentNoteNumber) {
        notifyDialog(
          "The note with same values is already saved. Please change a field at least"
        );
        return false;
      }
    } else {
      if (isNew === true) {
        //clear savedDialogFields
        savedDialogFields = [];
        allSavedNotes.push(newNoteValue);
        saveChanges("allSavedNotes", allSavedNotes);
      } else {
        allSavedNotes[currentNoteNumber] = newNoteValue;
        saveChanges("allSavedNotes", allSavedNotes);
      }
    }

    $.extend(editNote, {
      deckName: newDeckList,
      modelName: newModeList,
      tags: newTag,
      allFields: allFields,
      firstField: tempFirstField.slice(0, 20),
      allHiddenFields: allHiddenFields,
      lasterror: "",
    });
    $("#jsGrid").jsGrid(isNew ? "insertItem" : "updateItem", editNote);

    $("#detailsDialog").dialog("close");
  };
}

function removeSettings(value) {
  if (!isValidValue(value)) {
    return false;
  } else {
    chrome.storage.sync.remove(value, function (Items) {
      debugLog("settings removed" + value);
    });
  }
}

function getShortcutValues() {
  for (var key in favourites.shortcuts) {
    {
      $("#change" + key + "Shortcut").val(
        favourites.shortcuts[key] + " (change)"
      );
    }
  }
}

function restore_All_Fields(fulfilled, item) {
  $("#addCard").empty();

  $.each(fulfilled, function (key, value) {
    let icon;
    let iconName;
    let imageTitle;
    let fieldvalue;
    if (allSettings.stickyFields === true) {
      if (stickyFields.hasOwnProperty(currentNoteType)) {
        if (stickyFields[currentNoteType][value] === true) {
          iconName = "sOn";
          imageTitle = "turn off sticky field";
        } else {
          iconName = "sOff";
          imageTitle = "turn on sticky field";
        }
      } else {
        iconName = "sOff";
        imageTitle = "turn on sticky field";
      }

      icon =
        '<button type="button" style="background-color:white;border:none;" class="' +
        iconName +
        '" id="stickyButton~' +
        currentNoteType +
        "~" +
        value +
        '">\n' +
        '                <img src="images/' +
        iconName +
        '.png" alt="icon" title="' +
        imageTitle +
        '" ">\n' +
        "            </button></p>\n";
    } else {
      icon = "";
    }
    if (isValidValue(savedFormFields[key])) {
      fieldvalue = savedFormFields[key]
        .replace(/<p><\/p>/gi, "<br>")
        .replace(/<p><br><\/p>/gi, "<br>");
    } else {
      fieldvalue = "";
    }
    $("#addCard").append(
      '<label for="' +
        value +
        '-Field">' +
        value +
        "</label>" +
        icon +
        '<textarea type="text" class="fieldsToMaintain" id="' +
        value +
        '-Field" name="' +
        value +
        '">' +
        fieldvalue +
        "</textarea><br>"
    );
  });

  saveChanges("connectionStatus", true);
  runAfterElementExists(".fieldsToMaintain", function () {
    createDynamicFields();
  });
}

function restoreShortcuts() {
  favourites.shortcuts = {
    Deck: "alt+shift+d",
    Cloze: "alt+shift+w",
    QuickSubmit: "ctrl+enter",
    Model: "alt+shift+c",
    Reset: "alt+shift+r",
  };

  saveChanges("favourites", favourites);
  rebindAllKeys();
  getShortcutValues();

  notifySetting("The default shortcuts have been restored.");
}

function getChanges(key, type = "sync") {
  var valueReturn;

  if (type == "sync") {
    chrome.storage.sync.get([key], function (result) {
      //debugLog('Value currently is ' + result[key]');
      valueReturn = result[key];
      if (isValidValue(valueReturn)) {
        setValue(key, valueReturn);
      } else {
        debugLog(key + " is" + valueReturn);
      }
    });
  } else if (type === "local") {
    chrome.storage.local.get([key], function (result) {
      //debugLog('Value currently is ' + result[key]');
      valueReturn = result[key];
      if (isValidValue(valueReturn)) {
        setValue(key, valueReturn);
      } else {
        debugLog(key + " is undefined or null with value" + valueReturn);
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

function runAfterElementExists(jquery_selector, callback) {
  var checker = window.setInterval(function () {
    //if 1 or more elements found
    if ($(jquery_selector).length) {
      //stop checking
      clearInterval(checker);

      //call the passed in function via the parameter above
      callback();
    }
  }, 300);
}

function createDynamicFields() {
  var currentTextSelection;

  /**
   * Gets the color of the current text selection
   */
  function getCurrentTextColor() {
    return $(editor.getSelectedParentElement()).css("color");
  }

  /**
   * Custom `color picker` extension
   */
  var ColorPickerExtension = MediumEditor.extensions.button.extend({
    name: "colorPicker",
    action: "applyForeColor",
    aria: "color picker",
    contentDefault: "<span class='editor-color-picker'>Text Color<span>",

    init: function () {
      this.button = this.document.createElement("button");
      this.button.classList.add("medium-editor-action");
      this.button.innerHTML = "<b>color</b>";

      //init spectrum color picker for this button
      initPicker(this.button);

      //use our own handleClick instead of the default one
      this.on(this.button, "click", this.handleClick.bind(this));
    },
    handleClick: function (event) {
      //keeping record of the current text selection
      currentTextSelection = editor.exportSelection();

      //sets the color of the current selection on the color picker
      $(this.button).spectrum("set", getCurrentTextColor());

      //from here on, it was taken form the default handleClick
      event.preventDefault();
      event.stopPropagation();

      var action = this.getAction();

      if (action) {
        this.execAction(action);
      }
    },
  });

  var pickerExtension = new ColorPickerExtension();

  function setColor(color) {
    var finalColor = color ? color.toRgbString() : "rgba(0,0,0,0)";

    pickerExtension.base.importSelection(currentTextSelection);
    pickerExtension.document.execCommand("styleWithCSS", false, true);
    pickerExtension.document.execCommand("foreColor", false, finalColor);
  }

  function initPicker(element) {
    $(element).spectrum({
      allowEmpty: true,
      color: "#f00",
      showInput: true,
      showAlpha: true,
      showPalette: true,
      showInitial: true,
      hideAfterPaletteSelect: true,
      preferredFormat: "hex3",
      change: function (color) {
        setColor(color);
      },
      hide: function (color) {
        setColor(color);
      },
      palette: [
        ["#000", "#444", "#666", "#999", "#ccc", "#eee", "#f3f3f3", "#fff"],
        ["#f00", "#f90", "#ff0", "#0f0", "#0ff", "#00f", "#90f", "#f0f"],
        [
          "#f4cccc",
          "#fce5cd",
          "#fff2cc",
          "#d9ead3",
          "#d0e0e3",
          "#cfe2f3",
          "#d9d2e9",
          "#ead1dc",
        ],
        [
          "#ea9999",
          "#f9cb9c",
          "#ffe599",
          "#b6d7a8",
          "#a2c4c9",
          "#9fc5e8",
          "#b4a7d6",
          "#d5a6bd",
        ],
        [
          "#e06666",
          "#f6b26b",
          "#ffd966",
          "#93c47d",
          "#76a5af",
          "#6fa8dc",
          "#8e7cc3",
          "#c27ba0",
        ],
        [
          "#c00",
          "#e69138",
          "#f1c232",
          "#6aa84f",
          "#45818e",
          "#3d85c6",
          "#674ea7",
          "#a64d79",
        ],
        [
          "#900",
          "#b45f06",
          "#bf9000",
          "#38761d",
          "#134f5c",
          "#0b5394",
          "#351c75",
          "#741b47",
        ],
        [
          "#600",
          "#783f04",
          "#7f6000",
          "#274e13",
          "#0c343d",
          "#073763",
          "#20124d",
          "#4c1130",
        ],
      ],
    });
  }

  if (typeof allSettings.forcePlainText != "boolean") {
    allSettings.forcePlainText = true;
  }
  if (typeof allSettings.cleanPastedHTML != "boolean") {
    allSettings.cleanPastedHTML = true;
  }
  var allButtons;
  if (isValidValue(favourites.buttons) && favourites.buttons.length > 0) {
    allButtons = favourites.buttons;
  } else {
    allButtons = [
      "colorPicker",
      "bold",
      "italic",
      "underline",
      "pre",
      "removeFormat",
      "anchor",
    ];
    favourites.buttons = allButtons;
    saveChanges("favourites", favourites);
  }

  editor = new MediumEditor(".fieldsToMaintain", {
    paste: {
      forcePlainText: allSettings.forcePlainText,
      cleanPastedHTML: allSettings.cleanPastedHTML,
      cleanReplacements: [],
      cleanAttrs: ["class", "style", "dir"],
      cleanTags: ["meta"],
      unwrapTags: [],
    },
    disableDoubleReturn: true,
    placeholder: false,
    toolbar: {
      buttons: allButtons,
    },
    extensions: {
      colorPicker: pickerExtension,
    },
  });
  var triggerAutoSave = function (event, editable) {
    var textarea = jQuery(editable).next();
    var textareaId = textarea.attr("id");
    var key = textareaId.replace("-Field", "");

    debugLog("savedFormFields +live save");

    //save changes to savedNotes
    if (
      (" " + document.activeElement.className + " ").indexOf(" dialogFields ") >
        -1 &&
      currentDialogType == "Add"
    ) {
      key = textareaId.replace("dialog-", "").replace("-Field", "");
      var value = $("#dialogModelList").val();
      var indexOfField = storedFieldsForModels[value].indexOf(key);
      if (indexOfField != "-1") {
        savedDialogFields[indexOfField] = "" + editable.innerHTML + "";
      }

      saveChanges("savedDialogFields", savedDialogFields, "local");
    } else {
      //front note
      savedFormFields[currentFields.indexOf(key)] =
        "" + editable.innerHTML + "";

      saveChanges("savedFormFields", savedFormFields, "local");
    }
    textarea.text(jQuery(editable).html()).trigger("change");
  };

  var throttledAutoSave = MediumEditor.util.throttle(triggerAutoSave, 800); // 1 second
  // Listening to event

  editor.subscribe("editableInput", throttledAutoSave);
}

function notifyDialog(data, style = "error") {
  // #dialogsLog
  //      $("#settingsLog")
  $(".notifyjs-wrapper").trigger("notify-hide");

  $.notify(data, {
    style: "bootstrap-html",
    className: style,
    arrowShow: false,
  });
}

function notifyUser(data, style = "warning", mode = "text", time = "5000") {
  $(".notifyjs-wrapper").trigger("notify-hide");
  if (mode === "text") {
    $.notify(data, style);
  } else {
    $.notify(data, {
      style: "bootstrap-html",
      className: style,
      arrowShow: false,
      gap: 2,
      autoHideDelay: time,
    });
  }
}

function saveNotesLog(data, style = "warning") {
  if (style == "success" || style == "info") {
    $("#dialogGridSubmit").notify(data, {
      style: "bootstrap-html",

      className: style,
      arrowShow: false,
      gap: 2,
    });
  } else {
    $("#saveNotesLogs").notify(data, {
      style: "bootstrap-html",
      className: style,
      arrowShow: false,
      gap: 2,
    });
  }
}

function notifyShortcut(data, style = "info") {
  //      $("#settingsLog")
  $(".notifyjs-wrapper").trigger("notify-hide");

  $.notify(data, {
    style: "bootstrap-html",
    className: style,
    arrowShow: false,
  });
}

function notifySetting(data, style = "success") {
  //      $("#settingsLog")
  $(".notifyjs-wrapper").trigger("notify-hide");

  $.notify(data, {
    style: "bootstrap-html",
    className: style,
    arrowShow: false,
  });
}

function selectFavourite(optionValue, whatElement, type) {
  //find element select

  let value;
  let currentSelected;
  //if element, change and save it
  let favToSelect;
  if (type == "currentDeck") {
    currentSelected = currentDeck;
    if (
      !isValidValue(favourites.deckCounter) ||
      favourites.deckCounter >= favourites.deck.length
    ) {
      favourites.deckCounter = 0;
    }

    favToSelect = favourites.deck[favourites.deckCounter];
    favourites.deckCounter = favourites.deckCounter + 1;
  } else {
    currentSelected = currentNoteType;
    if (
      !isValidValue(favourites.modelCounter) ||
      favourites.modelCounter >= favourites.model.length
    ) {
      favourites.modelCounter = 0;
    }

    favToSelect = favourites.model[favourites.modelCounter];

    favourites.modelCounter = favourites.modelCounter + 1;
  }
  value = $(whatElement)
    .find('option[value="' + favToSelect + '"]')
    .val();

  if (value) {
    if (value != currentSelected) {
      $(whatElement + ' option[selected="selected"]').each(function () {
        $(this).removeAttr("selected");
      });
      $(whatElement).val(favToSelect).change();
      debugLog(whatElement + " Selected");
      //chrome storage is limited. better to compromise than syncing
      // saveChanges(type, value);
    }
  } else {
    notifyUser(
      "No " +
        type +
        " is selected as favourite. <br> Please select in settings",
      "warning",
      "html"
    );
  }
}

function rebindAllKeys(contextType = "AddCard") {
  if (!isValidValue(favourites.shortcuts)) {
    var shortcuts = {
      Deck: "alt+shift+d",
      Cloze: "alt+shift+w",
      QuickSubmit: "ctrl+enter",
      Model: "alt+shift+c",
      Reset: "alt+shift+r",
    };

    favourites.shortcuts = shortcuts;
    saveChanges("favourites", favourites);
  }

  Mousetrap.bind(favourites.shortcuts.Deck, function (e) {
    if (contextType == "AddCard") {
      selectFavourite(favourites.deck, "#deckList", "currentDeck");
    } else if (contextType == "dialogCard") {
      selectFavourite(favourites.deck, "#dialogDeckList", "currentDeck");
    }
  });

  //reset button
  Mousetrap.bind(favourites.shortcuts.Reset, function (e) {
    if (contextType == "AddCard") {
      clearTextBoxes();
    } else if (contextType == "dialogCard") {
      clearDialogTextBoxes();
    }
  });

  Mousetrap.bind(favourites.shortcuts.Model, function (e) {
    if (contextType == "AddCard") {
      selectFavourite(favourites.model, "#modelList", "currentNoteType");
    } else if (contextType == "dialogCard") {
      selectFavourite(favourites.model, "#dialogModelList", "currentNoteType");
    }
  });
  Mousetrap.bind(favourites.shortcuts.Cloze, function (e) {
    selectCloze();
  });
  Mousetrap.bind(favourites.shortcuts.QuickSubmit, function (e) {
    if (contextType == "AddCard") {
      submitToAnki("AddCard");
    } else if (contextType == "dialogCard") {
      $("#submitDialog").trigger("submit");
    }
  });
}

function parseAndToObject(arr) {
  var finalObj = {};
  var data = [];
  var tempObject = {};
  for (var i = 0; i < arr.length; ++i) {
    var tempFields = "";
    var tempFirstField = "";

    tempObject = {};
    var counter = 0;
    try {
      var tempAllFieldsObject = JSON.parse(arr[i]).note.fields;
      for (var field in tempAllFieldsObject) {
        if (counter === 0) {
          tempFirstField = tempAllFieldsObject[field];
          counter++;
        }
        var value = JSON.parse(arr[i]).note.fields[field];
        if (value) {
          tempFields = tempFields + field + ":" + value + " ";
        } else {
          tempFields = tempFields + field + ": ";
        }
      }
      if (tempFields.length > 30) {
        tempFields = tempFields;
      }
      tempObject.allHiddenFields = JSON.parse(arr[i]).note.fields;
      //strip html for preview

      tempObject.allFields = tempFields
        .replace(/<(?:.|\n)*?>/gm, "")
        .slice(0, 30);
      if (isValidValue(tempFirstField)) {
        tempObject.firstField = tempFirstField
          .replace(/<(?:.|\n)*?>/gm, "")
          .slice(0, 30);
      } else {
        tempObject.firstField = tempFirstField;
      }

      tempObject.deckName = JSON.parse(arr[i]).note.deckName;
      tempObject.modelName = JSON.parse(arr[i]).note.modelName;
      tempObject.tags = JSON.parse(arr[i]).note.tags;
      tempObject.lasterror = JSON.parse(arr[i]).lasterror;
    } catch (error) {
      notifyUser(
        "Saved Notes are corrupted. Please deleted corrupted notes",
        "error",
        "text",
        3000
      );
    }

    data[i] = tempObject;
  }
  finalObj.data = data;
  finalObj.itemsCount = [arr.length];
  return finalObj;
}

function connectToAnki(callback) {
  background
    .ankiConnectRequest("version", 6)
    .then(function () {
      callback(true);
    })
    .catch(function (error) {
      callback(false, JSON.stringify(error));
    });
}

function saveSettings(item, value = false) {
  if (value === "true") {
    value = true;
  } else if (value === "false") {
    value = false;
  }
  if (isValidValue(allSettings)) {
    allSettings[item] = value;
  } else {
    allSettings = {};
    allSettings[item] = value;
  }
  saveChanges("allSettings", allSettings);
}

function cleanedDeckName(value) {
  let lengthParent, spaceLength, last, newDeckName;
  value = value + "";
  if (value.indexOf("::") !== -1) {
    lengthParent = value.substring(0, value.lastIndexOf("::") + 2).length;
    spaceLength = lengthParent - 10 > 3 ? lengthParent - 10 : "5";

    last = value.substring(value.lastIndexOf("::") + 2, value.length);
    //    space workaround for html
    newDeckName = "\xA0".repeat(spaceLength) + last;
  } else {
    newDeckName = value;
  }
  return newDeckName;
}

function isValidValue(value) {
  if (value === null || typeof value === "undefined") {
    return false;
  } else {
    return true;
  }
}

//wait for document to load
$(document).ready(function () {
  //create decks and models
  init();
  //create tabs
  $("#tabs").tabs();
  $(".multipleSelect2").select2({
    width: null,
  });
  //Saved Notes

  //Monitors currentDeck value.
  $("#dialogModelList").change(function (e) {
    var value = $("#dialogModelList").val();
    var combinedFieldAndOldValues = {};

    if (value) {
      //fix for twice change initiation
      if (editingCard) {
        editingCard = false;
      } else {
        if (
          storedFieldsForModels.hasOwnProperty(value) &&
          allSettings.syncFrequency !== "Live"
        ) {
          if (currentDialogType == "Edit") {
            try {
              var currentNoteFields = JSON.parse(
                allSavedNotes[currentNoteNumber]
              ).note.fields;
              var extractedNoteValues = [];

              for (let key in currentNoteFields) {
                extractedNoteValues.push(currentNoteFields[key]);
              }

              //constrcut the array
              var counter = 0;
              for (var keyz in storedFieldsForModels[value]) {
                var assignValue = "";

                if (extractedNoteValues[counter]) {
                  assignValue = extractedNoteValues[counter];
                  counter++;
                }

                var fieldName = storedFieldsForModels[value][keyz];
                combinedFieldAndOldValues[fieldName] = assignValue;
              }
            } catch (error) {
              debugLog(error);
            }
          } else {
            //for add card from dialog

            for (let keyz in storedFieldsForModels[value]) {
              let fieldName = storedFieldsForModels[value][keyz];
              var fieldValue = "";
              if (savedDialogFields[keyz]) {
                fieldValue = savedDialogFields[keyz];
              }
              combinedFieldAndOldValues[fieldName] = fieldValue;
            }
          }
          createDialogFields(combinedFieldAndOldValues, "Edit");
        } else {
          var item = value;
          var params = {
            modelName: item,
          };
          //debugLog(params);
          background
            .ankiConnectRequest("modelFieldNames", 6, params)
            .then(function (fulfilled) {
              //    store for next time
              storedFieldsForModels[item] = fulfilled;
              saveChanges("storedFieldsForModels", storedFieldsForModels);

              for (var key in fulfilled) {
                var fieldValue = "";
                if (savedDialogFields[key]) {
                  fieldValue = savedDialogFields[key];
                }
                combinedFieldAndOldValues[fulfilled[key]] = fieldValue;
              }
              createDialogFields(combinedFieldAndOldValues, "Edit");
            })
            .catch(function (error) {
              if (error === null) {
              }
              saveChanges("connectionStatus", false);

              if (background.findRegex("failed to connect", error)) {
                $("#dialogAddCard").empty();
                if (!isValidValue(item)) {
                  item = "card";
                }
                $("#dialogAddCard").html(
                  '<p><span style="color:red;">No connection!!</span> <br><span style="color:#0000ff;">fields of ' +
                    item +
                    "</span> were not cached yet.<br><br>Run Anki and try to add card again</p>"
                );

                debugLog(error);
              } else if (error === null) {
                $("#dialogAddCard").empty();
                $("#dialogAddCard").html(
                  '<p><span style="color:red;">Model ' +
                    currentNoteType +
                    " is deleted in Anki. Create it or <input type='button' id='deleteModelFromCache' class='deleteModel' value='delete From cache'></span></p>"
                );
              } else {
                $("#dialogAddCard").empty();
                $("#dialogAddCard").html(
                  "<p><span style=\"color:red;\">Model type not found. Please create it and refresh cache</span></p><input type='button' id='refreshData' class='refreshModel' style='background-color:#ffa500;'value='Refresh Models'>"
                );
              }
            });
        }
      }
    }
  });

  //select settings for sync
  if (allSettings.saveNotes === true) {
    $("#saveNotesToggle img").attr("src", "images/ankiMode.png");
  }

  $(document).on("click", "#reloadExtension", function () {
    location.reload();
  });

  $(document).on("click", "#syncSettingsButton", function () {
    if (isValidValue(modelNamesSaved)) {
      notifyUser(
        "Sync settings has been saved to manual. <br>Reloading, please wait.",
        "success",
        "html"
      );
      setTimeout(function () {
        location.reload();
      }, 2000);
    }
    saveSettings("syncFrequency", "Manual");
    $("#syncSettingSpan").hide();
  });

  $(document).on("click", "#saveNotesConfirmButton", function () {
    saveChanges("saveNotes", true);
    submitToAnki();
  });

  $(document).on("click", "#nightMode", function () {
    {
      $(".medium-editor-element").each(function () {
        if (themeMode === "day") {
          $(this).addClass("nightMode");
        } else {
          $(this).removeClass("nightMode");
        }
        // clear Medium editor's divs
      });
    }

    themeMode = themeMode == "day" ? "night" : "day";
  });
  //quick toggle sticky fields
  $(document).on("click", "#saveNotesToggle", function () {
    let modeNotify;
    let valToSave;
    if (allSettings.saveNotes === true) {
      $(this).children("img").attr("src", "images/localMode.png");
      $(this)
        .children("img")
        .attr(
          "title",
          "click to turn on check Anki first if fail then save note Mode"
        );

      modeNotify =
        "All notes will be saved locally without checking for Anki <br>";
      valToSave = "trueLocal";
    } else {
      $(this).children("img").attr("src", "images/ankiMode.png");
      $(this)
        .children("img")
        .attr(
          "title",
          "click to turn on save note locally (useful for computer with no Anki)"
        );

      modeNotify =
        "All notes will be first sent to Anki.<br> If Anki is not running, they will be saved locally";

      valToSave = true;
    }
    saveSettings("saveNotes", valToSave);

    notifyUser(modeNotify, "success", "html");
  });
  //quick toggle sticky fields
  $(document).on("click", "#stickyFieldsToggle", function () {
    let valueToSave;
    if (allSettings.stickyFields === true) {
      valueToSave = false;
    } else {
      valueToSave = true;
    }

    saveSettings("stickyFields", valueToSave);
    cardFields(currentNoteType);
  });

  //restore settings state when user click setting page

  $(document).on("click", ".tab-settings", function () {
    //sync
    $("#syncSetting option[value=" + allSettings.syncFrequency + "]").attr(
      "selected",
      "selected"
    );
    $("#forcePlainText option[value=" + allSettings.forcePlainText + "]").attr(
      "selected",
      "selected"
    );
    $(
      "#cleanPastedHTML option[value=" + allSettings.cleanPastedHTML + "]"
    ).attr("selected", "selected");
    $("#saveNotes option[value=" + allSettings.saveNotes + "]").attr(
      "selected",
      "selected"
    );
    $(
      "#removeDuplicateNotes option[value=" +
        allSettings.removeDuplicateNotes +
        "]"
    ).attr("selected", "selected");
    $("#stickyFields option[value=" + allSettings.stickyFields + "]").attr(
      "selected",
      "selected"
    );
    $(
      "#appendFields option[value=" + allSettings.appendModeSettings + "]"
    ).attr("selected", "selected");
    $(
      "#showFavouriteDeck option[value=" + allSettings.favouriteDeckMenu + "]"
    ).attr("selected", "selected");
    $(
      "#showFavouriteModel option[value=" + allSettings.favouriteModelMenu + "]"
    ).attr("selected", "selected");

    $("#FavouriteDeck").val(favourites.deck);
    $("#FavouriteDeck").trigger("change");
    $("#FavouriteModel").val(favourites.model);
    $("#FavouriteModel").trigger("change");
    $("#FavouriteButtons").val(favourites.buttons);
    $("#FavouriteButtons").trigger("change");
  });

  $(document).on("click", 'button[id^="stickyButton~"]', function () {
    var value = $(this).attr("id");
    var className = $(this).attr("class");
    var noteName;

    var fieldNameValue;

    if (value) {
      var noteNameString = value.replace(/stickyButton~/gi, "").split("~");
      if (noteNameString[0]) {
        noteName = noteNameString[0];
      }
      if (noteNameString[1]) {
        fieldNameValue = noteNameString[1];
      }
    }

    if (typeof stickyFields == "undefined") {
      stickyFields = {};
    }
    if (!isValidValue(stickyFields[noteName])) {
      stickyFields[noteName] = {};
    }

    if (className == "sOff") {
      $(this).children("img").attr("src", "images/sOn.png");
      $(this).children("img").attr("title", "turn off sticky fields");

      $(this).attr("class", "sOn");
      //    turn on
      stickyFields[noteName][fieldNameValue] = true;
      saveChanges("stickyFields", stickyFields);
    } else {
      $(this).attr("class", "sOff");
      $(this).children("img").attr("title", "turn on sticky fields");

      $(this).children("img").attr("src", "images/sOff.png");

      stickyFields[noteName][fieldNameValue] = false;
      saveChanges("stickyFields", stickyFields);
    }
  });

  $(document).on("click", ".tab-shortcuts", function () {
    getShortcutValues();
  });

  if (allSettings.syncFrequency == "Live") {
    $(".refreshData").hide();
  } else {
    $(".refreshData").show();
  }
  //Monitors currentDeck value.
  $("#FavouriteDeck").change(function () {
    var value = $(this).select2("data");
    let currentFav = [];
    for (var item of value) {
      currentFav.push(item.id);
    }

    favourites.deck = currentFav;
    saveChanges("favourites", favourites);
  });

  $("#FavouriteModel").change(function () {
    let value = $(this).select2("data");
    let currentFav = [];
    for (let item of value) {
      currentFav.push(item.id);
    }
    favourites.model = currentFav;
    saveChanges("favourites", favourites);
  });

  $("#FavouriteButtons").change(function () {
    let value = $(this).select2("data");
    let currentFav = [];
    for (let item of value) {
      currentFav.push(item.id);
    }

    favourites.buttons = currentFav;
    if (isValidValue(editor)) {
      editor.destroy();
    }
    createDynamicFields();
    saveChanges("favourites", favourites);
  });

  $("#saveNotes").change(function () {
    var value = $(this).val();
    saveSettings("saveNotes", value);
  });

  $("#stickyFields").change(function () {
    var value = $(this).val();
    saveSettings("stickyFields", value);

    cardFields(currentNoteType);
  });

  $("#removeDuplicateNotes").change(function () {
    var value = $(this).val();

    saveSettings("removeDuplicateNotes", value);
  });

  $("#showFavouriteDeck").change(function () {
    var value = $(this).val();
    saveSettings("favouriteDeckMenu", value);
    port.postMessage("reloadContextMenu");
  });

  $("#showFavouriteModel").change(function () {
    var value = $(this).val();
    saveSettings("favouriteModelMenu", value);
    port.postMessage("reloadContextMenu");
  });

  $("#deckList").change(function () {
    var value = $(this).val();
    currentDeck = value;
    saveChanges("currentDeck", value);
  });

  //Monitors currentNoteType value.

  $("#modelList").change(function () {
    var value = $(this).val();
    //debugLog(value)
    currentNoteType = value;
    saveChanges("currentNoteType", value);
    cardFields(value);
    //clear saved Setting on background.js
    //  clearTextBoxes();
  });

  $("#syncSetting").change(function () {
    var value = $(this).val();
    //debugLog(value)

    saveSettings("syncFrequency", value);

    notifySetting("Sync has been set to " + allSettings.syncFrequency);
    if (allSettings.syncFrequency == "Live") {
      $(".refreshData").hide();
    } else {
      $(".refreshData").show();
    }
  });

  $("#dialog").change(function () {
    var value = $(this).val();
    //debugLog(value)
    currentNoteType = value;
    saveChanges("currentNoteType", value);
    cardFields(value);
    //clear saved Setting on background.js
    //  clearTextBoxes();
  });

  $("#forcePlainText").change(function () {
    var value = $(this).val();
    saveSettings("forcePlainText", value);
  });
  $("#cleanPastedHTML").change(function () {
    var value = $(this).val();
    saveSettings("cleanPastedHTML", value);
  });

  function strcmp(a, b) {
    if (a.toString() < b.toString()) return -1;
    if (a.toString() > b.toString()) return 1;
    return 0;
  }

  $(".shortcut").click(function () {
    let currentId = $(this).attr("id");
    let id = currentId.replace(/change(.*?)Shortcut/g, "$1");
    notifyShortcut("Please press the shortcut Keys for favourite" + id);

    Mousetrap.record(function (sequence) {
      let shortcutPresent = false;
      let assignedShortcut = 0;
      let userPressedKeys = sequence.join(" ");
      for (let key in favourites.shortcuts) {
        if (strcmp(userPressedKeys, favourites.shortcuts[key]) === 0) {
          shortcutPresent = true;
          assignedShortcut = key;
          break;
        }
      }

      if (shortcutPresent === false) {
        if (!isValidValue(favourites.shortcuts)) {
          favourites.shortcuts = {};
        }
        let shortcutId;

        shortcutId = sequence.join(" ");
        notifyShortcut(
          shortcutId + " is set for " + id + " shortcut",
          "success"
        );
        favourites.shortcuts[id] = shortcutId;
        saveChanges("favourites", favourites);
        Mousetrap.reset();
        rebindAllKeys();
        getShortcutValues();
        //    call all shortcuts again
      } else {
        notifyShortcut(
          userPressedKeys + " is already assigned to " + assignedShortcut,
          "error"
        );
      }
    });
  });

  //reset button
  $("#resetButton").click(function () {
    clearTextBoxes("all");
  });

  $("#dialogGridSubmit").click(function () {
    $("#dialog-gridSubmit-confirm")
      .html(
        '<span class="ui-icon ui-icon-extlink" style="float:left; margin:12px 12px 20px 0;"></span> Do you want to send all saved notes to Anki. Anki Needs to be running to receive notes <br>'
      )
      .dialog({
        resizable: false,
        height: "auto",
        width: 400,
        modal: true,
        buttons: {
          "Submit All Data": function () {
            $(this).dialog("close");
            sendNotesAnki();
          },
          Cancel: function () {
            $(this).dialog("close");
          },
        },
      });
  });

  function download(data, filename, type) {
    try {
      var file = new Blob([data], {
        type: type,
      });
      if (window.navigator.msSaveOrOpenBlob)
        // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
      else {
        // Others
        var a = document.createElement("a"),
          url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }

      notifyUser("Successfully exported notes", "success", "text");
    } catch (errorz) {
      notifyUser("Error occured while exporting", "error", "text");
    }
  }

  $("#dialogGridExport").click(function () {
    if (allSavedNotes.length > 0) {
      var date = new Date().toJSON();

      var filename = "ExportedNotes" + date + ".txt";
      var content = JSON.stringify(allSavedNotes);
      download(content, filename, "txt");
    }
  });

  $("#dialogGridImport").click(function () {
    chrome.tabs.query(
      {
        active: true,
        currentWindow: true,
      },
      function (tabs) {
        {
          chrome.tabs.executeScript(
            tabs[0].id,
            {
              file: "src/importFile.js",
            },
            function () {
              let error = chrome.runtime.lastError;
              if (error) {
                //chrome.runtime.lastError.message
                notifyUser(
                  "Error: Don't have permission to open import file on this active tab.<br> Please browse to another tab to open import dialog.",
                  "error",
                  "html"
                );
              }
            }
          );
        }
      }
    );
  });

  $("#dialogGridDeleteAll").click(function () {
    $("#dialog-gridDeleteAll-confirm").html(
      '<span class="ui-icon ui-icon-alert" style="float:left; margin:12px 12px 20px 0;"></span> Do you want to delete all saved notes. <br>The notes can\'t be recovered.'
    );
    $("#dialog-gridDeleteAll-confirm").dialog({
      resizable: false,
      height: "auto",
      width: 400,
      modal: true,
      buttons: {
        "Delete all items": function () {
          $(this).dialog("close");
          allSavedNotes = [];
          saveChanges("allSavedNotes", allSavedNotes);
          $("#jsGrid").jsGrid("render");
        },
        Cancel: function () {
          $(this).dialog("close");
        },
      },
    });
  });
  $("#dialogResetButton").click(function () {
    clearDialogTextBoxes();
  });

  $("#clearAllDefaults").click(function () {
    clearNotes();
  });
  //delete extension
  $("#nukeExtension").click(function () {
    deleteExtension();
  });

  $("#appendFields").change(function () {
    var value = $(this).val();
    saveSettings("appendModeSettings", value);

    //change append mode for context menu
    let currentAppendMode;
    if (value == 1) {
      currentAppendMode = "switched on for context menu";
    } else {
      currentAppendMode = "switched off";
    }
    notifySetting("<p>Append Mode: " + currentAppendMode + "</p>");
  });

  $("#changeDebugMode").click(function () {
    changeDebugMode();
  });

  $("#reloadChromeMenu").click(function () {
    if (isValidValue(deckNamesSaved)) {
    }
    reloadExtension();
  });

  $(document).on("click", "#refreshDecks", function () {
    connectToAnki(function (status, error) {
      if (status === true) {
        removeSettings("currentDeck");
        removeSettings("deckNamesSaved");
        currentDeck = null;
        location.reload();
      } else {
        if (background.findRegex("failed to connect to AnkiConnect", error)) {
          notifyUser(
            "No connection to Anki. Please run Anki<br>and click refresh button to reload all fields",
            "error",
            "html"
          );
        } else {
          notifyUser(error, "error");
        }
      }
    });
  });
  $(document).on("click", "#refreshModel, .refreshModel", function () {
    connectToAnki(function (status, error) {
      if (status === true) {
        $("#addCard").empty();
        removeSettings("modelNamesSaved");
        removeSettings("currentNoteType");
        removeSettings("storedFieldsForModels");
        currentNoteType = null;
        location.reload();
      } else {
        if (background.findRegex("failed to connect to AnkiConnect", error)) {
          notifyUser(
            "No connection to Anki. Please run Anki<br>and click refresh button to reload all fields",
            "error",
            "html"
          );
        } else {
          notifyUser(error, "error");
        }
      }
    });
  });

  $(document).on("click", "#refreshTags", function () {
    connectToAnki(function (status, error) {
      if (status === true) {
        removeSettings("getTagsSaved");
        location.reload();
      } else {
        notifyUser(error, "error");
      }
    });
  });

  $(document).on("click", "#deleteDeckFromCache", function () {
    var deckToDelete = currentDeck;
    if (isValidValue(deckToDelete)) {
      debugLog(deckToDelete);
      if (removeFromArray(deckNamesSaved, deckToDelete)) {
        saveChanges("deckNamesSaved", deckNamesSaved);
      }

      $("#deckList option[value='" + deckToDelete + "']").remove();

      removeSettings("currentDeck");
      onceTimeForceSync = 1;
      location.reload();
    }
  });

  $(document).on(
    "click",
    ".tab-settings, .tab-shortcuts, .tab-about",
    function () {
      $("#detailsDialog").dialog("close");
      Mousetrap.reset();
    }
  );

  $(document).on("click", ".tab-add-card", function () {
    $("#detailsDialog").dialog("close");
    Mousetrap.reset();
    rebindAllKeys();
  });

  $(document).on("click", "#deleteModelFromCache", function () {
    var ModelToDelete = currentNoteType;
    if (isValidValue(ModelToDelete)) {
      debugLog(ModelToDelete);
      if (removeFromArray(modelNamesSaved, currentNoteType)) {
        saveChanges("modelNamesSaved", modelNamesSaved);
      }

      debugLog(modelNamesSaved);

      $("#modelList option[value='" + ModelToDelete + "']").remove();
      if (storedFieldsForModels.hasOwnProperty(currentNoteType)) {
        removeSettings("currentFields");
        delete storedFieldsForModels[ModelToDelete];
        debugLog(storedFieldsForModels);
        saveChanges("storedFieldsForModels", storedFieldsForModels);
        removeSettings("currentNoteType");

        errorLogs.innerHTML = "";
        onceTimeForceSync = 1;

        location.reload();
      } else {
        removeSettings("currentNoteType");
        currentNoteType = "basic";
        onceTimeForceSync = 1;
        location.reload();
        errorLogs.innerHTML =
          "Please, reload extension by clicking Popup icon.";
      }
    }
  });
  //reset button
  $("#restoreShortcuts").click(function () {
    restoreShortcuts();
  });

  //    act on form
  $("#form1").submit(function (event) {
    event.preventDefault();
    submitToAnki();
  });

  //save edited note from savedNotes

  $("#syncAnkiToWeb").click(function () {
    syncAnkiToAnkiWeb();
  });

  Mousetrap.prototype.stopCallback = function (e, element, combo, sequence) {
    var self = this;

    if (self.paused) {
      return true;
    } else {
      return false;
    }
  };

  //bind keys
  rebindAllKeys();
});

function selectCloze() {
  var activeId = document.activeElement.id;

  if (activeId.includes("medium-editor-")) {
    //in current medium editor..
    var presentClozes = [];
    var clozeNumber;
    var currentContent = $("#" + activeId).html();
    //find current clozed in the match
    currentContent.replace(/{{[c]([\d]{1,3})::/gim, function (m, p1) {
      //callback: push only unique values
      if (presentClozes.indexOf(p1) == -1) presentClozes.push(p1);
    });

    if (
      presentClozes
        .sort(function (a, b) {
          return a - b;
        })
        .slice(-1)[0]
    ) {
      clozeNumber =
        parseInt(
          presentClozes
            .sort(function (a, b) {
              return a - b;
            })
            .slice(-1)[0]
        ) + 1;
    } else {
      clozeNumber = 1;
    }

    var text = "";
    if (window.getSelection) {
      text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
      text = document.selection.createRange().text;
    }
    var currentSelection = saveSelection(document.activeElement);

    var replacementText = "{{c" + clozeNumber + "::" + text + "}}";
    pasteHtmlAtCaret(replacementText);
    if (currentSelection.end - currentSelection.start === 0) {
      setCaretCharIndex($("#" + activeId)[0], currentSelection.start + 6);
    } else {
      setCaretCharIndex($("#" + activeId)[0], currentSelection.end + 8);
    }
    editor.trigger("editableInput", {}, document.activeElement);
  }
}

//Functions by Tim Down from Rangy libray
function saveSelection(containerEl) {
  var charIndex = 0,
    start = 0,
    end = 0,
    foundStart = false,
    stop = {};
  var sel = window.getSelection();

  function traverseTextNodes(node, range) {
    if (node.nodeType == 3) {
      if (!foundStart && node == range.startContainer) {
        start = charIndex + range.startOffset;
        foundStart = true;
      }
      if (foundStart && node == range.endContainer) {
        end = charIndex + range.endOffset;
        throw stop;
      }
      charIndex += node.length;
    } else {
      for (var i = 0, len = node.childNodes.length; i < len; ++i) {
        traverseTextNodes(node.childNodes[i], range);
      }
    }
  }

  if (sel.rangeCount) {
    try {
      traverseTextNodes(containerEl, sel.getRangeAt(0));
    } catch (ex) {
      if (ex != stop) {
        throw ex;
      }
    }
  }

  return {
    start: start,
    end: end,
  };
}

//Functions by Tim Down from Rangy libray
function setCaretCharIndex(containerEl, index) {
  var charIndex = 0,
    stop = {};

  function traverseNodes(node) {
    if (node.nodeType == 3) {
      var nextCharIndex = charIndex + node.length;
      if (index >= charIndex && index <= nextCharIndex) {
        window.getSelection().collapse(node, index - charIndex);
        throw stop;
      }
      charIndex = nextCharIndex;
    }
    // Count an empty element as a single character. The list below may not be exhaustive.
    else if (
      node.nodeType === 1 &&
      /^(input|br|img|col|area|link|meta|link|param|base)$/i.test(node.nodeName)
    ) {
      charIndex += 1;
    } else {
      var child = node.firstChild;
      while (child) {
        traverseNodes(child);
        child = child.nextSibling;
      }
    }
  }

  try {
    traverseNodes(containerEl);
  } catch (ex) {
    if (ex != stop) {
      throw ex;
    }
  }
}

function pasteHtmlAtCaret(html) {
  var sel, range;
  if (window.getSelection) {
    // IE9 and non-IE
    sel = window.getSelection();
    if (sel.getRangeAt && sel.rangeCount) {
      range = sel.getRangeAt(0);
      range.deleteContents();

      // Range.createContextualFragment() would be useful here but is
      // non-standard and not supported in all browsers (IE9, for one)
      var el = document.createElement("div");
      el.innerHTML = html;
      var frag = document.createDocumentFragment(),
        node,
        lastNode;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      // Preserve the selection
      if (lastNode) {
        range = range.cloneRange();
        range.setStartAfter(lastNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  } else if (document.selection && document.selection.type != "Control") {
    // IE < 9
    document.selection.createRange().pasteHTML(html);
  }
}

function removeFromArray(array, element) {
  const index = array.indexOf(element);

  if (index !== -1) {
    array.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

function syncAnkiToAnkiWeb() {
  background
    .ankiConnectRequest("sync", 6)
    .then(function (fulfilled) {
      debugLog(fulfilled);
    })
    .catch(function (error) {
      background.notifyUser(error, "notifyAlert");
    });
}

var counterForAll;
var savedNotesLength;
var currentErrors = [];
var notesAddedCounter;
var notesDuplicateCounter;

function sendNotesAnki() {
  counterForAll = 0;
  notesAddedCounter = 0;
  notesDuplicateCounter = 0;
  savedNotesLength = allSavedNotes.length;

  connectToAnki(function (status, error) {
    if (status === true) {
      if (isValidValue(allSavedNotes)) {
        for (i = 0; i < allSavedNotes.length; i++) {
          sendEachNoteAnki(allSavedNotes[i]);
        }
      }
    } else {
      if (background.findRegex("failed to connect to AnkiConnect", error)) {
        saveNotesLog(
          "No, connection. Please open Anki to send saved cards.",
          "error"
        );
      }
    }
  });
}

function sendEachNoteAnki(item) {
  //get note params
  var retrievedNoteVal = JSON.parse(item).note;
  //see if tags are already an arrray

  if (retrievedNoteVal["tags"].length === 1) {
    retrievedNoteVal["tags"] = background.getTagsArray(
      retrievedNoteVal["tags"][0]
    );
  }

  let params = {
    note: retrievedNoteVal,
  };
  background
    .ankiConnectRequest("addNote", 6, params)
    .then(function (fulfilled) {
      if (removeFromArray(allSavedNotes, item)) {
        debugLog("item removed");
      }
      notesAddedCounter++;
    })
    .catch(function (error) {
      if (background.findRegex("Note is duplicate", error)) {
        if (!isValidValue(allSettings.removeDuplicateNotes)) {
          saveSettings("removeDuplicateNotes", false);
        }
        if (allSettings.removeDuplicateNotes === false) {
          currentErrors[item] = "Duplicate Note";
        } else if (allSettings.removeDuplicateNotes === true) {
          if (removeFromArray(allSavedNotes, item)) {
            debugLog("duplicate item removed");
          }
        }
        notesDuplicateCounter++;
      } else if (background.findRegex("Collection was not found", error)) {
        currentErrors[item] = "Collection not found";
      } else if (background.findRegex("Note was empty", error)) {
        currentErrors[item] = "Empty Fields";
      } else if (background.findRegex("Model was not found", error)) {
        currentErrors[item] = "NoteType Not Found";
      } else if (background.findRegex("Deck was not found", error)) {
        currentErrors[item] = "Deck Not Found";
      } else if (error === null) {
        currentErrors[item] = "empty main field";
      } else {
        currentErrors[item] = JSON.stringify(error);
      }
    })
    .finally(function () {
      counterForAll++;

      if (counterForAll % 7 === 0) {
        $("#jsGrid").jsGrid("render");
      }
      if (counterForAll === savedNotesLength) {
        $("#jsGrid")
          .jsGrid("render")
          .done(function () {
            for (var item in currentErrors) {
              var index = allSavedNotes.indexOf(item);
              if (index != "-1") {
                // $('.saveNotesTable' + allSavedNotes.indexOf(item)).find('.dialogTableError').html(currentErrors[item]);

                var noteWithLastError = {};

                noteWithLastError.note = JSON.parse(allSavedNotes[index]).note;
                noteWithLastError.lasterror = currentErrors[item];
                allSavedNotes[index] = JSON.stringify(noteWithLastError);
              }
            }
            var duplicateRemovedorFound;
            if (allSettings.removeDuplicateNotes === true) {
              duplicateRemovedorFound = " removed: ";
            } else {
              duplicateRemovedorFound = " found: ";
            }
            if (notesAddedCounter > 0) {
              saveNotesLog("Notes Added:" + notesAddedCounter, "success");
            } else {
              saveNotesLog("No new note to add", "info");
            }
            if (notesDuplicateCounter > 0) {
              saveNotesLog(
                "Duplicates" + duplicateRemovedorFound + notesDuplicateCounter,
                "error"
              );
            }

            saveChanges("allSavedNotes", allSavedNotes);
            var pageSize = $("#jsGrid").jsGrid("option", "pageSize");
            var lastPage = Math.ceil(allSavedNotes.length / pageSize);
            $("#jsGrid").jsGrid("openPage", lastPage);
          });
      }
    });
}

function saveNewTags(currentTags) {
  let newTagsFound = false;
  currentTags.forEach(function (tagValue) {
    let trimmedTagValue = tagValue.trim();
    if (isValidValue(trimmedTagValue) && isValidValue(availableTags)) {
      if (availableTags.indexOf(trimmedTagValue) === -1) {
        availableTags.push(trimmedTagValue);
        newTagsFound = true;
      }
    }
  });
  if (newTagsFound == true) {
    saveChanges("getTagsSaved", availableTags, "local");
  }
}

function submitToAnki(type = "default") {
  let params = null;
  //Getting Field types
  let currentTags = [];
  var tagsStr = "";

  if (type === "dialog") {
    tagsStr = $("#dialogTags").val();
  } else {
    tagsStr = $("#tags").val().toString();
  }

  if (isValidValue(tagsStr)) {
    tagsStr = tagsStr.replace(/;/g, ",");
    currentTags = background.getTagsArray(tagsStr);
    saveNewTags(currentTags);
  }

  //debugLog("currenttags" + currentTags);
  var counter = 0;
  var arrayToSend = {};
  var sendValue;
  let lastFieldError = [];

  $("#addCard textarea").each(function () {
    let textfieldValue = $(this).val();
    let value = $(this)
      .attr("id")
      .replace(/-Field/gi, "");
    sendValue = "";
    try {
      if (background.isTextFieldValid(textfieldValue)) {
        sendValue = textfieldValue;
        counter++;
      } else {
        sendValue = "";
      }
    } catch (error) {
      sendValue = "";
      if (!lastFieldError) {
        lastFieldError.push(value);
      }
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
      notifyUser(
        "Empty Fields. Can't connect to Anki. Please check it",
        "error"
      );
    } else if (lastFieldError.length !== 0) {
      notifyUser(
        "Please edit your card. Can't parse ID" + lastFieldError.toString(),
        "error"
      );
    } else {
      notifyUser("All fields are empty", "warning");
    }
  } else if (allSettings.saveNotes === "trueLocal") {
    let valueToStore = JSON.stringify(params);
    saveNotesLocally(valueToStore);
  } else {
    background
      .ankiConnectRequest("addNote", 6, params)
      .then(function (fulfilled) {
        clearTextBoxes();
        //debugLog(fulfilled);

        notifyUser("Note is successfully added to Anki.", "success");
      })
      .catch(function (error) {
        catchAnkiSubmitErrors(error, params);
      });
  }
}

function catchAnkiSubmitErrors(error, params) {
  //notification for error
  var currentError = JSON.stringify(error);
  if (background.findRegex("Note is duplicate", currentError)) {
    notifyUser(
      "This is a duplicate Note. Please change main field and try again",
      "error"
    );
  } else if (background.findRegex("Collection was not found", currentError)) {
    notifyUser("Collection was not found", "error");
  } else if (background.findRegex("Note was empty", currentError)) {
    notifyUser("Note or front field was empty", "error");
  } else if (background.findRegex("Model was not found", currentError)) {
    errorLogs.innerHTML =
      '<span style="color:red";>Model not found</span>:' +
      currentNoteType +
      '<input type="button" id="deleteModelFromCache" class="' +
      currentNoteType +
      '" value="Delete Model">\n';
  } else if (background.findRegex("Deck was not found", currentError)) {
    errorLogs.innerHTML =
      '<span style="color:red";>Deck not found</span>:' +
      currentDeck +
      '<input type="button" id="deleteDeckFromCache" value="Delete Deck">\n';
  } else if (
    background.findRegex("failed to connect to AnkiConnect", currentError)
  ) {
    //defaults save Notes
    if (typeof allSettings.saveNotes === "undefined") {
      saveSettings("saveNotes", true);
    }

    if (allSettings.saveNotes === true) {
      var valueToStore = JSON.stringify(params);
      saveNotesLocally(valueToStore);
    } else {
      notifyUser(
        "No, connection. Please, run Anki to Add card.<br> or Do you want <span style='color:#0000ff'> to save cards locally.?<br></span>Click <input type='button' style='background:#4CAF50' id='saveNotesConfirmButton' value='save cards locally'> to turn on settings.",
        "error",
        "html",
        "15000"
      );
    }
  } else if (background.findRegex("fasst", currentError)) {
    background.notifyUser("Error: " + error, "notifyalert");
    errorLogs.innerHTML =
      '<span style="color:red";>No, connection. Please, run Anki to Add card</span>';
  } else {
    if (background.findRegex("duplicate", currentError)) {
      errorLogs.innerHTML =
        '<span style="color:red";>Duplicate Card. Please edit any field</span>';
    } else if (
      background.findRegex("collection is not available", currentError)
    ) {
      errorLogs.innerHTML =
        '<span style="color:red";>Multiple profiles.Please select profile in Anki.</span>';
    } else {
      errorLogs.innerHTML = '<span style="color:red";>' + error + "</span>";
    }
  }
}

function saveNotesLocally(value) {
  if (allSavedNotes.indexOf(value) != "-1") {
    notifyUser("Note is already Saved in local list.", "error");
  } else {
    allSavedNotes.push(value);

    if (allSettings.saveNotes === "trueLocal") {
      notifyUser("Note Added to saved Notes<br> ", "success", "html");
    } else {
      notifyUser(
        "Note Saved successfully to locally saved notes list.",
        "success"
      );
    }
    clearTextBoxes();
    saveChanges("allSavedNotes", allSavedNotes);

    $("#jsGrid").jsGrid("render");
  }
}

function clearTextBoxes(type = "single") {
  errorLogs.innerHTML = "";
  if (type === "all") {
    savedFormFields = [];

    $("textarea").each(function () {
      $(this).val("");
      // clear Medium editor's divs
      jQuery("#addCard div").html("");
    });
  } else if (
    allSettings.stickyFields === true &&
    isValidValue(stickyFields[currentNoteType])
  ) {
    $("textarea").each(function () {
      let TextFieldId = $(this).attr("id");

      let key = TextFieldId.replace(/-Field/gi, "");
      let checkKeyValue = stickyFields[currentNoteType][key];

      if (checkKeyValue === false || !isValidValue(checkKeyValue)) {
        savedFormFields[currentFields.indexOf(key)] = "";

        //clear medium editor
        $(this).val("");

        $(this).prev().text("");
      }
    });
  } else {
    //default for StickyFields
    if (!isValidValue(allSettings.stickyFields)) {
      saveSettings("stickyFields", true);
    }

    savedFormFields = [];

    $("textarea").each(function () {
      $(this).val("");
    });
    jQuery("#addCard div").html("");
  }

  if (type !== "backgroundAll") {
    saveChanges("savedFormFields", savedFormFields, "local");
  }

  if (allSettings.stickyTags !== true) {
    $("#tags").val("");
    saveChanges("stickyTags", "", "local");
  }
}

function clearDialogTextBoxes() {
  savedDialogFields = [];
  saveChanges("savedDialogFields", savedDialogFields, "local");
  $(".dialogFields").each(function () {
    // reset value for all the fields
    $(this).val("");
  });
  //clear Medium editor's divs
  jQuery("#dialogAddCard div").html("");

  $("#dialogTags").val("");
}

//if context menu crashes
function reloadExtension() {
  port.postMessage("reloadContextMenu");
  notifySetting("<p>Successfully reloaded the context menu</p>");
}

function changeDebugMode() {
  //change append mode for context menu
  var currentDebugMode;
  if (allSettings.debugStatus === 0 || !isValidValue(allSettings.debugStatus)) {
    saveSettings("debugStatus", 1);
    currentDebugMode = "switched on";
  } else {
    saveSettings("debugStatus", 0);

    currentDebugMode = "switched off";
  }
  notifySetting("<p>Debug Mode: " + currentDebugMode + "</p>");
}

function deleteExtension() {
  chrome.management.uninstallSelf({}, function (callback) {
    debugLog("alfa cleared.Please install again");
  });
}

$.fn.isAfter = function (sel) {
  return this.prevAll(sel).length !== 0;
};
$.fn.isBefore = function (sel) {
  return this.nextAll(sel).length !== 0;
};

function saveChanges(key, value, type = "sync") {
  // Check that there's some code there.
  if (!isValidValue(value)) {
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

function clearNotes() {
  // CHANGE: array, not a string
  var toRemove = [];

  chrome.storage.sync.get(function (Items) {
    $.each(Items, function (index, value) {
      // build an array with all the keys to remove
      toRemove.push(index);
    });

    debugLog(toRemove + "settings removed");

    // inside callback
    chrome.storage.sync.remove(toRemove, function (Items) {
      background.restore_defaults();

      setTimeout(function () {
        location.reload();
      }, 2000);
    });
  });
  notifySetting(
    "<p>Saved changes removed and restored to default!!</p><br>Reloading extension."
  );
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
