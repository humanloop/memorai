<script>
  import { onMount } from "svelte";
  import { post } from "./utils.js";

  export let name;
  export let selection =
    "On July 20, 1969, Armstrong became the first human to step on the moon. He and lunar lander Eagle pilot Edwin 'Buzz' Aldrin walked around the surface for about three hours and carried out experiments. Michael Collins, the command module pilot, stayed in orbit around the moon during their descent.";
  let sentSelection = "";
  let questions = [];

  async function getQuestions() {
    if (selection) {
      let response = await post("http://3.17.29.171/question/", { text_data: selection });
      sentSelection = selection;
      console.log(response);
      questions = response;
    }
  }

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.msg === "something_completed") {
      //  To do something
      console.log(request.data.subject);
      console.log(request.data.content);
      alert("jhi");
    }
  });

  onMount(async () => {
    getQuestions();
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
            i,
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
    <button
      class="button is-small"
      on:click="{() => {
        alert('not enabled');
      }}">
      Send to anki
    </button>

  </div>
</section>

<style>
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
    max-height: 160px;
  }
</style>
