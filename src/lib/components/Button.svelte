<script>
  let { onclick, children } = $props();
</script>

<button class="button" {onclick}>
  {@render children()}
</button>

<style>
  .button {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    padding: 0.5em 1em;
    box-sizing: border-box;
    background: var(--overlay1);
    border: 1px solid var(--border2);
    border-radius: var(--brad1);
    color: var(--fg2-5);
    font-size: 1em;
    cursor: pointer;
    transition: background var(--td-100), border-color var(--td-100), color var(--td-100);
  }

  .button:hover {
    background: var(--overlay2);
    border-color: var(--border3);
    color: var(--fg5);
  }

  .button:active {
    background: var(--overlay1);
  }
</style>
