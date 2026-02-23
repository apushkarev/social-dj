<script>
  import Modal from './Modal.svelte';
  import InputField from './InputField.svelte';
  import Button from './Button.svelte';
  import { globals } from '../globals.svelte.js';
  import { treeState } from '../tree-state.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { createTreeItem } from '../tree-management.svelte.js';

  let {
    type,               // 'playlist' | 'folder'
    parentFolderId,
    parentFolderName,
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

  const title = $derived(type === 'folder' ? 'Add folder to' : 'Add playlist to');

  function cancel() {
    itemName = '';
    visible = false;
    onclose?.();
  }

  // Opens all ancestor folders along the path to nodeId (exclusive of node itself)
  function ensureAncestorsOpen(newIndex, newHierarchy, nodeId) {
    const path = newIndex[nodeId];
    if (!path) return;

    let cursor = { children: newHierarchy };

    for (let j = 0; j < path.length - 1; j++) {
      cursor = cursor.children[path[j]];
      if (!treeState.isOpen(cursor.id)) treeState.toggle(cursor.id);
    }
  }

  async function createHandler() {
    const name = itemName.trim();
    if (!name) return;

    // — library operation + persist —
    const result = await createTreeItem(parentFolderId, type, name);
    if (!result) return;

    const { newId, newHierarchy, newIndex } = result;

    // — open ancestor folders and direct parent —
    ensureAncestorsOpen(newIndex, newHierarchy, newId);
    if (!treeState.isOpen(parentFolderId)) treeState.toggle(parentFolderId);

    // — select new item —
    if (type === 'folder') {
      globals.set('selectedPlaylistId', null);
      globals.set('selectedFolderView', { id: newId, name, trackIds: [] });
    } else {
      globals.set('selectedFolderView', null);
      globals.set('selectedPlaylistId', newId);
    }

    saveAppState();

    // — close modal —
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
  <p class="modal-title">{parentFolderName}</p>

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
