<script>
  let { anchorRect, currentColor, onselect, onclose } = $props();

  const COLORS = [
    'var(--red)',
    'var(--bristol-orange)',
    'var(--yellow-warm)',
    'var(--meadow-green)',
    'var(--mint)',
    'var(--cornflower-blue)',
  ];

  let el = $state(null);

  $effect(() => {
    function handleOutside(e) {
      if (el && !el.contains(e.target)) onclose();
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  });
</script>

<div
  class="modal"
  style="left: {anchorRect.left}px; top: {anchorRect.bottom + 8}px;"
  bind:this={el}
>
  <div class="colors">
    {#each COLORS as color}
      <div
        class="swatch"
        class:active={currentColor === color}
        style="background-color: {color};"
        onclick={() => { onselect(color); onclose(); }}
      ></div>
    {/each}
  </div>

  <button class="clear-btn" onclick={() => { onselect(null); onclose(); }}>
    Clear
  </button>
</div>

<style>
  .modal {
    position: fixed;
    z-index: 1000;
    background: var(--bg3);
    border: 1px solid var(--border3);
    border-radius: var(--brad2);
    padding: 0.75em;
    display: flex;
    flex-direction: column;
    gap: 0.625em;
    box-shadow: 0 8px 32px var(--black4);
  }

  .colors {
    display: grid;
    grid-template-columns: repeat(3, 2rem);
    gap: 0.375em;
  }

  .swatch {
    width: 2rem;
    height: 2rem;
    border-radius: var(--brad1);
    cursor: pointer;
    transition: transform var(--td-100);
  }

  .swatch:hover {
    transform: scale(1.1);
  }

  .swatch.active {
    outline: 2px solid var(--fg4);
    outline-offset: 2px;
  }

  .clear-btn {
    background: none;
    border: none;
    border-top: 1px solid var(--border2);
    padding: 0.5em 0 0;
    color: var(--fg2);
    font-size: 0.875em;
    font-family: inherit;
    cursor: pointer;
    text-align: left;
    transition: color var(--td-100);
  }

  .clear-btn:hover {
    color: var(--fg4);
  }
</style>
