<script>
  import { onMount, onDestroy } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { post } from "./utils.js";
  export let name;
  export let selection =
    "On July 20, 1969, Armstrong became the first human to step on the moon. Michael Collins, the command module pilot, stayed in orbit around the moon during their descent.";
  let sentSelection = "";
  let questions = [];
  let loading = false;
  let sent = false;

  function formatCloze(question) {
    return {
      deckName: "Default",
      modelName: "Cloze",
      fields: {
        Text: question,
        Extra: ""
      },
      tags: ["memorai"]
    };
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async function sendToAnki() {
    console.log(`sending ${JSON.stringify(questions, null, 4)}`);
    let data = {
      action: "addNotes",
      version: 6,
      params: {
        notes: questions.map(formatCloze)
      }
    };
    console.log(`sending ${JSON.stringify(data, null, 4)}`);
    sent = true;
    try {
        let response = await post("http://localhost:8765", data);
        console.log(response);
    } catch (err) {
        if (err.message === "Failed to fetch"){
            alert('Anki is not connected. Please start the Anki app')
        }
        console.log(err.message)
        }

    chrome.browserAction.setIcon({ path: "icon-faded-64.png" });
    while (questions) {
      await sleep(500);
      questions = questions.splice(1);
    }
  }

  async function getQuestions() {
    if (selection) {
      let response = await post("http://3.17.29.171/question/", { text_data: selection });
      sentSelection = selection;
      console.log(response);
      questions = response.map(q => {
        return q.replace(":", "::");
      });
      sent = false;
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
            <div class="notification" class:is-info="{sent}" out:fly>
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

    <button class="button is-fullwidth" on:click="{sendToAnki}">Send to anki</button>

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
