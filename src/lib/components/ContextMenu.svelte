<script>
  import { contextMenu } from '../context-menu.svelte.js';
  import { icons } from '../icons.js';

  const MARGIN = 8;

  let menuEl = $state();
  let adjustedX = $state(0);
  let adjustedY = $state(0);
  let positioned = $state(false);
  let hoveredIndex = $state(null);

  $effect(() => {
    const visible = contextMenu.visible;
    const x = contextMenu.x;
    const y = contextMenu.y;

    if (visible) {
      positioned = false;
      adjustedX = x;
      adjustedY = y;

      requestAnimationFrame(() => {
        if (!menuEl) return;

        const { width, height } = menuEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let ax = x;
        let ay = y;

        if (ax + width  > vw - MARGIN) ax = vw - width  - MARGIN;
        if (ax          < MARGIN)      ax = MARGIN;
        if (ay + height > vh - MARGIN) ay = vh - height - MARGIN;
        if (ay          < MARGIN)      ay = MARGIN;

        adjustedX = ax;
        adjustedY = ay;
        positioned = true;
      });
    } else {
      positioned = false;
      hoveredIndex = null;
    }
  });

  function handleItemClick(e, item, i) {
    e.stopPropagation();

    hoveredIndex = null;        

    setTimeout(() => {
      hoveredIndex = i;         

      setTimeout(() => {
          
        contextMenu.hide()

        setTimeout(() => {
          item.callback()
        }, 50);
      }, 75);
    }, 75);
  }
</script>

{#if contextMenu.visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="backdrop" onclick={() => contextMenu.hide()}></div>

  <div
    bind:this={menuEl}
    class="menu"
    class:positioned
    style="left: {adjustedX}px; top: {adjustedY}px;"
  >
    {#each contextMenu.items as item, i}
      {#if item.type === 'separator'}
        <hr class="separator" />
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="menu-item"
          class:active={hoveredIndex === i}
          onmouseenter={() => hoveredIndex = i}
          onmouseleave={() => { if (hoveredIndex === i) hoveredIndex = null; }}
          onclick={e => handleItemClick(e, item, i)}
        >
          <span class="item-icon">{@html icons[item.icon]}</span>
          <span class="item-text">{item.text}</span>
        </div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .menu {
    position: fixed;
    z-index: 101;
    min-width: 12em;
    background-color: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--brad2);
    padding: 0.25em;
    box-shadow: var(--bxs);
    opacity: 0;
  }

  .menu.positioned {
    opacity: 1;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.625em;
    padding: 0.125em 0.5em 0.125em 0.25em;
    cursor: pointer;
    color: var(--fg3-s);
    font-size: 0.9375em;
    font-weight: 500;
    user-select: none;

    border-radius: var(--brad1);

    margin-bottom: 0.25em;
  }

  .menu-item.active {
    background-color: var(--yellow-warm-80);
    color: var(--black4);
  }

  .item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 2em;
    height: 2em;
  }

  .item-icon :global(svg) {
    width: 100%;
    height: 100%;
  }

  .separator {
    margin: 0.375em 0;
    border: none;
    border-top: 1px solid var(--border2);
  }
</style>
