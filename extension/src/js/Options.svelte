<script>
  import { onMount, onDestroy } from "svelte";
  import { post } from "./utils.js";
  let ankiConnection = { status: "not connected" };

  async function ankiConnect() {
    let response = fetch("http://localhost:8765")
      .then(function(res) {
        console.log("ok");
        ankiConnection = "Connected!";
      })
      .catch(function(err) {
        console.log("error", err);
        ankiConnection =  "not connected";
      });
    console.log(response);
  }
  onMount(async () => {
    ankiConnect();
  });
</script>

<nav class="navbar" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href="https://memorai.humanloop.ml" title="Memorai homepage">
      <img class="logo" alt="logo" src="/icon-128.png" />
      <img class="logomark" alt="logo" src="/memorai.png" />
    </a>
  </div>
</nav>
<section class="section">
  <div class="container">
  <div class="level">
  <div class="level-item">
    Connected to Anki: {JSON.stringify(ankiConnection)}
  </div>
  <div class="level-item">
    <button class="button" on:click="{ankiConnect}">
      Connect
      <span class="icon">
        <i class="fas fa-home"></i>
      </span>
    </button>
  </div></div>
    
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
    padding-left: 10px;
    height: 24px;
  }
  .logo {
    padding-left: 10px;
  }
</style>
