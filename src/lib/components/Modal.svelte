<script>
  const MARGIN = 8;

  let { x, y, visible = $bindable(false), onclose = undefined, children } = $props();

  let modalEl = $state();
  let adjustedX = $state(x);
  let adjustedY = $state(y);
  let positioned = $state(false);

  $effect(() => {
    const nx = x;
    const ny = y;

    if (visible) {
      positioned = false;
      adjustedX = nx;
      adjustedY = ny;

      requestAnimationFrame(() => {
        if (!modalEl) return;

        const { width, height } = modalEl.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        let ax = nx;
        let ay = ny;

        // Right edge
        if (ax + width > vw - MARGIN) ax = vw - width - MARGIN;
        // Left edge
        if (ax < MARGIN) ax = MARGIN;
        // Bottom edge
        if (ay + height > vh - MARGIN) ay = vh - height - MARGIN;
        // Top edge
        if (ay < MARGIN) ay = MARGIN;

        adjustedX = ax;
        adjustedY = ay;
        positioned = true;
      });
    } else {
      positioned = false;
    }
  });

  function handleBackdropClick() {
    visible = false;
    onclose?.();
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal-backdrop" onclick={handleBackdropClick}></div>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={modalEl}
    class="modal"
    class:positioned
    style="left: {adjustedX}px; top: {adjustedY}px;"
    onclick={e => e.stopPropagation()}
  >
    {@render children()}
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
  }

  .modal {
    position: fixed;
    z-index: 101;
    min-width: 15em;
    background-color: var(--bg2);
    border: 1px solid var(--border3);
    border-radius: var(--brad2);
    padding: 1.25em;
    box-shadow: var(--bxs);
    opacity: 0;
    transition: opacity var(--td-100);
  }

  .modal.positioned {
    opacity: 1;
  }
</style>
