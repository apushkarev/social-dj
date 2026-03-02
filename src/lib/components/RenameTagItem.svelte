<script>
  import Modal from './Modal.svelte';
  import InputField from './InputField.svelte';
  import Button from './Button.svelte';
  import { renameTagItem } from '../tag-management.svelte.js';

  let {
    tagId,
    tagName,
    x,
    y,
    visible = $bindable(false),
    onclose = undefined,
  } = $props();

  let newName = $state(tagName);
  let inputEl = $state();

  $effect(() => {
    if (visible) {
      newName = tagName;
      requestAnimationFrame(() => {
        inputEl?.select();
      });
    }
  });

  function cancel() {
    visible = false;
    onclose?.();
  }

  function confirmRename() {
    const name = newName.trim();
    if (!name || name === tagName) {
      cancel();
      return;
    }

    renameTagItem(tagId, name);

    visible = false;
    onclose?.();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') confirmRename();
    if (e.key === 'Escape') cancel();
  }
</script>

<Modal {x} {y} bind:visible {onclose}>
  <p class="modal-title">Rename</p>

  <InputField
    bind:value={newName}
    bind:el={inputEl}
    onkeydown={handleKeydown}
  />

  <div class="modal-actions">
    <Button onclick={cancel}>Cancel</Button>
    <Button onclick={confirmRename}>Rename</Button>
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

  .modal-actions {
    display: flex;
    gap: 0.5em;
    margin-top: 0.75em;
    justify-content: flex-end;
  }
</style>
