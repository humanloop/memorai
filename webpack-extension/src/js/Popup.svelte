<script>
  import { onMount, onDestroy } from "svelte";
  import { post } from "./utils.js";
  export let name;
  export let allSavedNotes = ['testing text'];
  export let selection =
    "On July 20, 1969, Armstrong became the first human to step on the moon. Michael Collins, the command module pilot, stayed in orbit around the moon during their descent.";
  let sentSelection = "";
  let questions = [];
  let loading = false;


function sendNotesAnki() {
  counterForAll = 0;
  notesAddedCounter = 0;
  notesDuplicateCounter = 0;
  savedNotesLength = allSavedNotes.length;

connectToAnki(function (status, error) {
    if (status === true) {
        for (i = 0; i < allSavedNotes.length; i++) {
          sendEachNoteAnki(allSavedNotes[i]);
        }
    } else {
      if (background.findRegex("failed to connect to AnkiConnect", error)) {
        alert(
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



  function connectToAnki(callback) {
        background.ankiConnectRequest("version", 6)
            .then(function () {
                      callback(true);
                          
                    })
  }



  async function getQuestions() {
    if (selection) {
      let response = await post("http://3.17.29.171/question/", { text_data: selection });
      sentSelection = selection;
      console.log(response);
      questions = response;
    }
  }

  onMount(async () => {
    // deblue the icon
    chrome.browserAction.setIcon({ path: "icon-64.png" });
    chrome.storage.local.get("selection", function(res) {
      console.log(res);
      selection = res["selection"];
      getQuestions();
    });
  });
  onDestroy(async () => {
    // deblue the icon
    chrome.browserAction.setIcon({ path: "icon-faded-64.png" });
  });
</script>

<section class="section">
  <div class="container">
    <div class=" logomark level is-mobile">
      <div class="level-left has-text-right">
        <span class="level-item">
          <img class="logo" alt="logo" src="/icon-128.png" />
        </span>
      </div>
      <div class="level-right ">
        <h1 class="textmark title level-item has-text-left">Memorai</h1>
      </div>
    </div>
    <div class="field">
      <label class="label">Passage to remember</label>
      <div class="control">
        <textarea class="textarea" bind:value="{selection}"></textarea>
      </div>
    </div>
    {#if loading}
      loading...
    {:else}
      <div class="field">
        <label class="label">
          Anki questions
          {#if sentSelection !== selection}
            <button class="is-pulled-right button is-small" on:click="{getQuestions}">Get questions</button>
          {/if}
        </label>
        <div class="control">
          {#each questions as question, i}
            <div class="notification">
              <button
                class="delete"
                on:click="{() => {
                  questions = [...questions.slice(0, i), ...questions.slice(i + 1)];
                }}"></button>
              {question}
            </div>
          {/each}

        </div>
      </div>
    {/if}

    <button
      class="button is-small"
      on:click="{sendNotesAnki}">
      Send to anki
    </button>

  </div>
</section>

<style>
  .section {
    padding-top: 1.8rem;
  }
  .logomark {
    justify-content: center;
  }
  .logo {
    display: inline-block;
    width: 64px;
    margin-right: 10px;
  }
  .textmark {
    display: inline-block;
  }

  textarea {
    width: 300px;
    max-height: 140px;
  }
</style>
