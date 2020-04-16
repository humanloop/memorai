<script>
  import { onMount, onDestroy } from "svelte";
  import { post } from "./utils.js";
  let ankiConnection;
  let loading = true;

  async function ankiConnect() {
    let response = fetch("http://localhost:8765")
      .then(function(res) {
        console.log("ok");
        ankiConnection = "Connected!";
      })
      .catch(function(err) {
        console.log("error", err);
        ankiConnection = "not connected";
      });
    console.log(response);
  }
  onMount(async () => {
    ankiConnect();
  });
</script>


  <div class="container">
<nav class="navbar" role="navigation" aria-label="main navigation">
  <div class="navbar-brand">
    <a class="navbar-item" href="https://memorai.humanloop.ml" title="Memorai homepage">
      <img class="logo" alt="logo" src="/icon-128.png" />
      <img class="logomark" alt="logo" src="/memorai.png" />
    </a>
  </div>
</nav>
</div>

<section class="section">
  <div class="container content">
    <div class="level">
      <div class="level-item">Connected to Anki: <strong>{ankiConnection}</strong></div>
      <div class="level-item">
        <button class="button" on:click="{ankiConnect}">
          Connect
          <span class="icon">
            <i class="fas fa-home"></i>
          </span>
        </button>
      </div>
    </div>
    <h1>Memorai – AI assisted Anki card creator</h1>
    <p>Memorai is an AI assisted tool to help you remember anything you read with minimal effort.</p>
    <h2>How does it work?</h2>
    <p>
      There are two parts to Memorai – an AI assistant that generates questions to quiz you and a powerful memory
      technique called spaced repetition.
    </p>
    <ol>
      <li>You&#39;re browsing the internet when you come across a something you&#39;d like to remember.</li>
      <li>
        You highlight that text, rightclick and &quot;add to Memorai&quot;, you will see the Memorai brain go pink.
      </li>
      <li>Our AI assistant reads the text and automatically creates a set of flash-cards questions.</li>
      <li>
        We spend 5 minutes quizzing you to help you remember BUT we don&#39;t quiz you all at once. Instead we use a
        memory technique called spaced repetition. We quiz you on day one and, if you remember, we quiz you again a week
        later and then a month later and then a few months later. We use Anki to automatically adjust the spacing
        between questions so that what you want to remember stays in your long term memory.
      </li>
    </ol>
    <p>
      After just 5 minutes of work (spread across a few weeks) you will have almost effortlessly learned whatever you
      wanted to remember!
    </p>
    <h1 id="how-do-i-install-">How do I install?</h1>
    <p>We&#39;re currently in beta and our spaced repetition relies on Anki and Anki Connect to work.</p>
    <p>Installation steps:</p>
    <p>step 1 - Add this chrome extension to your browser</p>
    <p>
      step 2 - Go to
      <a href="https://apps.ankiweb.net/">https://apps.ankiweb.net/</a>
      and download Anki for your desktop
    </p>
    <p>step 3 - Open the Anki app</p>
    <ul>
      <li>Click tools in the top menu</li>
      <li>Click Add ons</li>
      <li>Click Get Add ons and a box will appear asking for a code</li>
      <li>
        Paste
        <code>2055492159</code>
        in the box and click OK
      </li>
    </ul>
    <p>step 4 - Remember anything you want!</p>
    <h1 id="what-people-are-saying-about-us">What people are saying about us</h1>
    <p>
      <strong>deliverator-487026</strong>
    </p>
    <p>This is perfect for remembering things from Medium!</p>
    <p>
      <strong>azl3n · 2d ago</strong>
    </p>
    <p>Super cool! Lot of potential with this, look forward to how you develop it further.</p>
    <p>
      <strong>pkadi · 2d ago</strong>
    </p>
    <p>This could be really cool even when learning a new language.</p>

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
