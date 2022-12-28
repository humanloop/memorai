<script>
  import { onMount, onDestroy, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { post } from "./utils.js";
  export let selection = "Michael Collins, the command module pilot, stayed in orbit around the moon.";
  let sentSelection = "";
  let cards = [];
  let status = "loading"
  let sent = false;
  let menuExpanded = false;
  let editting = [];

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

  function displayCloze(string) {
    let clozeRegex = /({{c(\d)::([^}]+)}})/;
    let index = 0;
    let s = string;
    while (s.match(clozeRegex)) {
      s = s.replace(clozeRegex, `<span class="cloze is-$2">$3</span>`);
    }
    return s;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function ClickCard(card) {
    console.log(card);
    card.editing = true;
    card = card;
    await tick();
    card.editor.focus();
  }

  async function sendToAnki() {
    status = 'sending'
    console.log(`sending ${JSON.stringify(cards.map(x=>x.text), null, 4)}`);
    let data = {
      action: "addNotes",
      version: 6,
      params: {
        notes: cards.map(x=>x.text).map(formatCloze)
      }
    };
    console.log(`sending ${JSON.stringify(data, null, 4)}`);
    sent = true;
    try {
      let response = await post("http://localhost:8765", data);
      chrome.browserAction.setIcon({ path: "icon-faded-64.png" });
      while (cards.length > 0) {
        await sleep(500);
        cards = cards.splice(1);
      }
      status = ''
      console.log(response);
    } catch (err) {
      if (err.message === "Failed to fetch") {
        alert("Anki is not connected. Please start the Anki app");
      }
      status = ''
      console.log(err.message);
    }
  }

  function openOptions() {
    console.log("open options");
    chrome.runtime.openOptionsPage();
  }

  async function getQuestions() {
    if (selection) {
      let response = await post("http://***replace with your URL***/question/?q_type=cloze", { text_data: selection });
      cards = response.map(x => {
        return { type: "cloze", text: x, editing: false };
      });

      sentSelection = selection;
      console.log(cards);
      sent = false;
    }
  }

  onMount(async () => {
    // deblue the icon
    chrome.browserAction.setIcon({ path: "icon-64.png" });
    chrome.storage.local.get("selection", function(res) {
      console.log(res);
      selection = res["selection"] || "";
      getQuestions();
      status = ''
    });
  });

  onDestroy(async () => {
    // deblue the icon
    chrome.browserAction.setIcon({ path: "icon-faded-64.png" });
  });
</script>

<nav class="navbar" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href="https://memorai.humanloop.ml" title="Memorai homepage">
      <img class="logo" alt="logo" src="/icon-128.png" />
      <img class="logomark" alt="logo" src="/memorai.png" />
    </a>

    <a
      href="#navbarMenu"
      role="button"
      on:click="{() => (menuExpanded = !menuExpanded)}"
      class="navbar-burger burger"
      class:is-active="{menuExpanded}"
      aria-label="menu"
      aria-expanded="false"
      data-target="navbarMenu">
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
      <span aria-hidden="true"></span>
    </a>
  </div>

  <div id="navbarMenu" class="navbar-menu" class:is-active="{menuExpanded}">
    <div class="navbar-end">
      <a on:click|preventDefault="{openOptions}" href="/options.html" class="navbar-item">Options</a>
    </div>
  </div>
</nav>

<section class="section">
  <div class="container">
    <div class="field">
      <label class="label">Passage to remember</label>
      <div class="control">
        <textarea
          class="textarea"
          bind:value="{selection}"
          placeholder="Paste text here or right-click '🧠 Add to Memorai' on selected text on any website."></textarea>
      </div>
    </div>
    {#if status==='loading'}
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
          {#each cards as card, i (card)}
            <div class="notification" class:is-info="{sent}" out:fly>
              <button
                class="delete"
                on:click="{() => {
                  cards = [...cards.slice(0, i), ...cards.slice(i + 1)];
                }}"></button>
              <div
                class="card-content is-editing"
                class:is-hidden="{!card.editing}"
                contenteditable="true"
                on:blur="{() => {
                  card.editing = false;
                }}"
                bind:this="{card.editor}"
                bind:textContent="{card.text}"></div>
              <div
                class:is-hidden="{card.editing}"
                class="card-content"
                on:click="{() => {
                  <!-- Not sure why but setting this in ClickCard does not cause the reactivity. -->
                  card.editing = true;
                  ClickCard(card);
                }}">
                {@html displayCloze(card.text)}
              </div>
            </div>
          {/each}

        </div>
      </div>
    <button class="button is-fullwidth" class:is-loading={status==='sending'} on:click="{sendToAnki}">Send to anki</button>
    {/if}


  </div>
</section>

<style>
  .section {
    padding-top: 1.8rem;
  }
  .navbar {
    padding-top: 5px;
  }
  .navbar-item img {
    max-height: 46px;
  }
  .logomark {
    /* justify-content: center; */
    padding-left: 10px;
    height: 24px;
  }
  .logo {
    padding-left: 10px;
  }

  textarea {
    width: 300px;
    max-height: 140px;
  }
  .is-editing {
    background: white;
  }

  .card-content {
    cursor: pointer;
  }
  
  :global(.cloze) {
    font-weight: bold;
    border-bottom: 2px solid black;
  }
  :global(.cloze.is-1) {
    color: hsl(348, 100%, 61%);
    border-color: hsl(348, 100%, 61%);
  }
  :global(.cloze.is-2) {
    color: hsl(204, 86%, 53%);
    border-color: hsl(204, 86%, 53%);
  }
  :global(.cloze.is-3) {
    color: hsl(141, 71%, 48%);
    border-color: hsl(141, 71%, 48%);
  }
</style>
