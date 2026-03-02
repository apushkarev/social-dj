<script>
  import Modal from './Modal.svelte';
  import InputField from './InputField.svelte';
  import Button from './Button.svelte';
  import { globals } from '../globals.svelte.js';
  import { tagState } from '../tag-state.svelte.js';
  import { createTagItem } from '../tag-management.svelte.js';

  let {
    type,             // 'tag' | 'tag-group'
    parentGroupId,    // null = root level
    parentGroupName,
    x,
    y,
    visible = $bindable(false),
    onclose = undefined,
  } = $props();

  let itemName = $state('');
  let inputEl = $state();

  $effect(() => {
    if (visible) {
      requestAnimationFrame(() => inputEl?.focus());
    }
  });

  const title = $derived(
    type === 'tag-group'
      ? 'Add tag group'
      : parentGroupId
        ? 'Add tag to'
        : 'Add tag'
  );

  function cancel() {
    itemName = '';
    visible = false;
    onclose?.();
  }

  function createHandler() {
    const name = itemName.trim();
    if (!name) return;

    const result = createTagItem(parentGroupId, type, name);
    if (!result) return;

    const { newId } = result;

    if (parentGroupId && !tagState.isOpen(parentGroupId)) {
      tagState.toggle(parentGroupId);
    }

    globals.set('selectedTagId', newId);

    itemName = '';
    visible = false;
    onclose?.();
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') createHandler();
    if (e.key === 'Escape') cancel();
  }
</script>

<Modal {x} {y} bind:visible {onclose}>

  <p class="modal-title">{title}</p>
  {#if type !== 'tag-group' && parentGroupId}
    <p class="modal-title">{parentGroupName}</p>
  {/if}

  <div class="vGap3"></div>

  <InputField
    bind:value={itemName}
    bind:el={inputEl}
    placeholder="Name"
    onkeydown={handleKeydown}
  />

  <div class="vGap3"></div>

  <div class="modal-actions">
    <Button onclick={cancel}>Cancel</Button>
    <Button onclick={createHandler}>Create</Button>
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
