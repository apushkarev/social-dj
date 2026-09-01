<script>
  import { contextMenu } from '../context-menu.svelte.js';
  import { icons } from '../icons.js';

  const MARGIN = 8;

  let menuEl = $state();
  let adjustedX = $state(0);
  let adjustedY = $state(0);
  let positioned = $state(false);
  let hoveredIndex = $state(null);

  const ANCHOR_GAP = 4;
  const CURSOR_OFFSET_X = 6;
  const CURSOR_OFFSET_Y = 6;
  const SUBMENU_GAP = 2;

  // Submenu state. `submenuIndex` is deliberately separate from `hoveredIndex`:
  // the panel has to survive the pointer leaving the parent row on its way into
  // the panel itself, so only hovering a *different* item closes it.
  let itemEls = $state([]);
  let submenuEl = $state();
  let submenuIndex = $state(null);
  let submenuX = $state(0);
  let submenuY = $state(0);
  let submenuPositioned = $state(false);

  function handleItemEnter(item, i) {
    hoveredIndex = i;
    submenuIndex = item.submenu ? i : null;
  }

  $effect(() => {
    const visible = contextMenu.visible;
    const x = contextMenu.x;
    const y = contextMenu.y;
    const anchor = contextMenu.anchor;
    const aaX = contextMenu.anchorAlignX;
    const aaY = contextMenu.anchorAlignY;

    if (visible) {
      positioned = false;
      adjustedX = x;
      adjustedY = y;

      requestAnimationFrame(() => {
        if (!menuEl) return;

        const { width, height } = menuEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let ax, ay;

        if (anchor) {
          
          const rect = anchor.getBoundingClientRect();

          if (aaX == 'target') {
            ax = rect.right - rect.width;  
          } else if (aaX == 'mouse') {
            ax = x + CURSOR_OFFSET_X;  
          }

          if (aaY == 'target') {
            ay = rect.bottom + ANCHOR_GAP;
          } else if (aaY == 'mouse') {
            ay = y + CURSOR_OFFSET_Y;
          }
          
        } else {
          ax = x + CURSOR_OFFSET_X;
          ay = y;
        }

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
      submenuIndex = null;
    }
  });

  // Places the submenu beside its parent row: to the right of the menu, flipped
  // to the left when it would overflow. Its height is capped by CSS at the
  // viewport, so the measured height is already the final one — a taller tree
  // simply scrolls inside the panel.
  $effect(() => {

    const idx = submenuIndex;

    if (idx === null || !contextMenu.visible) {
      submenuPositioned = false;
      return;
    }

    submenuPositioned = false;

    requestAnimationFrame(() => {

      const anchor = itemEls[idx];

      if (!submenuEl || !anchor || !menuEl) return;

      const itemRect = anchor.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();
      const { width, height } = submenuEl.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let sx = menuRect.right + SUBMENU_GAP;

      if (sx + width > vw - MARGIN) sx = menuRect.left - width - SUBMENU_GAP;
      if (sx < MARGIN)              sx = MARGIN;

      let sy = itemRect.top;

      if (sy + height > vh - MARGIN) sy = vh - MARGIN - height;
      if (sy < MARGIN)               sy = MARGIN;

      submenuX = sx;
      submenuY = sy;
      submenuPositioned = true;
    });
  });

  function handleItemClick(e, item, i) {
    e.stopPropagation();

    // Parent rows only reveal their submenu on hover — nothing to invoke.
    if (item.submenu) return;

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
          bind:this={itemEls[i]}
          class="menu-item"
          class:active={hoveredIndex === i || submenuIndex === i}
          style={item.color ? `--item-accent: ${item.color};` : ''}
          onmouseenter={() => handleItemEnter(item, i)}
          onmouseleave={() => { if (hoveredIndex === i) hoveredIndex = null; }}
          onclick={e => handleItemClick(e, item, i)}
        >
          <span class="item-icon">{@html icons[item.icon]}</span>
          <span class="item-text">{item.text}</span>
          {#if item.submenu}
            <span class="item-arrow">{@html icons.arrowLeft}</span>
          {/if}
        </div>
      {/if}
    {/each}
  </div>

  {#if submenuIndex !== null && contextMenu.items[submenuIndex]?.submenu}
    {@const submenu = contextMenu.items[submenuIndex].submenu}
    {@const SubmenuContent = submenu.component}

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      bind:this={submenuEl}
      class="submenu"
      class:positioned={submenuPositioned}
      style="left: {submenuX}px; top: {submenuY}px;"
    >
      <SubmenuContent {...submenu.props ?? {}} />
    </div>
  {/if}
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

  /* Sized to its content, but never taller than the viewport — past that it
     scrolls internally rather than growing off-screen. */
  .submenu {
    position: fixed;
    z-index: 102;
    width: max-content;
    min-width: 12em;
    max-width: 28em;
    max-height: calc(100vh - 16px);
    overflow-y: auto;
    overflow-x: hidden;
    background-color: var(--bg2);
    border: 1px solid var(--border2);
    border-radius: var(--brad2);
    box-shadow: var(--bxs);
    opacity: 0;
  }

  .submenu.positioned {
    opacity: 1;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 0.625em;
    padding: 0.125em 0.5em 0.125em 0.25em;
    cursor: pointer;
    color: var(--fg2-s);
    font-size: 0.9375em;
    font-weight: 500;
    user-select: none;

    border-radius: var(--brad1);

    margin-bottom: 0.25em;
  }

  .menu-item:last-of-type {
    margin-bottom: 0;
  }

  /* Items opt into a highlight color by setting `color` on the item —
     e.g. color: 'var(--red)' for destructive actions. Defaults to yellow. */
  .menu-item.active {
    background-color: var(--item-accent, var(--yellow-warm-80));
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

  .item-text {
    font-weight: 500;
  }

  /* Points right — same orientation as a collapsed folder arrow in the tree. */
  .item-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    margin-left: auto;
    transform: rotate(-180deg);
  }

  .item-icon :global(svg) {
    /* width: 100%; */
    height: 100%;
  }

  .separator {
    margin: 0.375em 0;
    border: none;
    border-top: 1px solid var(--border2);
  }
</style>
