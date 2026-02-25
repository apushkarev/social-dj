<script>
  let {
    icon = '',
    onclick = () => {},
    disabled = false
  } = $props();

  let isHovered = $state(false);
</script>

<button
  class="audio-button"
  class:disabled
  {onclick}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
>
  {@html icon}
</button>

<style>
  .audio-button {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg2-s);
    transition: color var(--td-150);
    -webkit-app-region: no-drag;
  }

  .audio-button:hover {
    color: var(--fg3-s);
  }

  .audio-button:active {
    color: var(--yellow-warm);
  }

  .audio-button.disabled {
    pointer-events: none;
  }

  .audio-button :global(.iconSVG) {
    width: 32px;
    height: 32px;
  }

  .audio-button :global(.iconPath) {
    stroke: currentColor;
  }
</style>
