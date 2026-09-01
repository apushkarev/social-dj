<script>
  import Modal from './Modal.svelte';
  import Button from './Button.svelte';

  let {
    title,
    message,
    confirmText = 'Confirm',
    x,
    y,
    visible = $bindable(false),
    onconfirm = undefined,
    onclose = undefined,
  } = $props();

  function cancel() {
    visible = false;
    onclose?.();
  }

  function confirm() {
    visible = false;
    onconfirm?.();
    onclose?.();
  }

  function handleKeydown(e) {
    if (!visible) return;

    if (e.key === 'Enter')  { e.preventDefault(); confirm(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<Modal {x} {y} bind:visible {onclose}>
  <p class="modal-title">{title}</p>

  <p class="modal-message">{message}</p>

  <div class="modal-actions">
    <Button onclick={cancel}>Cancel</Button>
    <Button onclick={confirm}>{confirmText}</Button>
  </div>
</Modal>

<style>
  .modal-title {
    margin: 0 0 0.75em 0;
    font-size: 0.8125em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.067em;
    color: var(--fg2);
  }

  .modal-message {
    margin: 0;
    max-width: 22em;
    font-size: 0.9375em;
    line-height: 1.4;
    color: var(--fg2-5);
  }

  .modal-actions {
    display: flex;
    gap: 0.5em;
    margin-top: 0.75em;
    justify-content: flex-end;
  }
</style>
