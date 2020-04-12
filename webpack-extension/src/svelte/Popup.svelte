<script>
  // import "bulma/css/bulma.css";

  export let name;
  export let selection =
    "On July 20, 1969, Armstrong became the first human to step on the moon. He and lunar lander Eagle pilot Edwin 'Buzz' Aldrin walked around the surface for about three hours and carried out experiments. Michael Collins, the command module pilot, stayed in orbit around the moon during their descent.";
</script>

<h1>Memorai</h1>
<img alt="logo" src="/icon-128.png" />

<textarea bind:value="{selection}"></textarea>

<h2>Hello {name}!</h2>

<style>
  textarea {
    width: 300px;
    height: 300px;
  }
</style>
