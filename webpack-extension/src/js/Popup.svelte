<script>
  // import "bulma/css/bulma.css";

  export let name;
  export let selection =
    "On July 20, 1969, Armstrong became the first human to step on the moon. He and lunar lander Eagle pilot Edwin 'Buzz' Aldrin walked around the surface for about three hours and carried out experiments. Michael Collins, the command module pilot, stayed in orbit around the moon during their descent.";
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

    <label>Facts to remember</label>
    <textarea class="textarea" bind:value="{selection}"></textarea>

    <div class="answers">
    tbd
    </div>

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
    height: 160px;
  }
</style>
