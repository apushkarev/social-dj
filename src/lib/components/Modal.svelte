<script>
  let { x, y, visible = $bindable(false), onclose = undefined, children } = $props();

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
  <div class="modal" style="left: {x}px; top: {y}px;" onclick={e => e.stopPropagation()}>
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
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }
</style>
