<script>
  import Modal from './Modal.svelte';
  import InputField from './InputField.svelte';
  import Button from './Button.svelte';
  import { globals } from '../globals.svelte.js';
  import { treeState } from '../tree-state.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';

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

  function generateId() {
    return (Date.now().toString(16) + Math.random().toString(16).slice(2, 8)).toUpperCase();
  }

  function rebuildIndex(hierarchy) {
    const index = {};

    function walk(nodes, path) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodePath = [...path, i];
        index[node.id] = nodePath;
        if (node.children) walk(node.children, nodePath);
      }
    }

    walk(hierarchy, []);
    return index;
  }

  // Open all folders along path from root to the given node (exclusive of node itself)
  function ensureAncestorsOpen(newIndex, newHierarchy, nodeId) {
    const path = newIndex[nodeId];
    if (!path) return;

    let cursor = { children: newHierarchy };

    for (let j = 0; j < path.length - 1; j++) {
      cursor = cursor.children[path[j]];
      if (!treeState.isOpen(cursor.id)) {
        treeState.toggle(cursor.id);
      }
    }
  }

  async function create() {
    const name = itemName.trim();
    if (!name) return;

    const library = globals.get('library');
    const parentPath = library.index[parentFolderId];
    if (!parentPath) return;

    const newId = generateId();

    const newItem = type === 'folder'
      ? { id: newId, type: 'folder', name, parentId: parentFolderId, children: [] }
      : { id: newId, type: 'playlist', name, parentId: parentFolderId, trackIds: [] };

    // — clone hierarchy and insert new item —
    console.time('[lib] add item to hierarchy');
    const newHierarchy = structuredClone($state.snapshot(library.hierarchy));

    let parentNode = { children: newHierarchy };
    for (const i of parentPath) {
      parentNode = parentNode.children[i];
    }
    parentNode.children.push(newItem);
    console.timeEnd('[lib] add item to hierarchy');

    // — rebuild index —
    console.time('[lib] rebuild index');
    const newIndex = rebuildIndex(newHierarchy);
    console.timeEnd('[lib] rebuild index');

    // — update globals —
    globals.set('library', {
      tracks: library.tracks,
      hierarchy: newHierarchy,
      index: newIndex,
    });

    // — open all ancestor folders so new item is visible —
    ensureAncestorsOpen(newIndex, newHierarchy, newId);

    // Open the direct parent too (ensureAncestorsOpen only covers nodes above the parent)
    if (!treeState.isOpen(parentFolderId)) {
      treeState.toggle(parentFolderId);
    }

    // — select the new item —
    if (type === 'folder') {
      globals.set('selectedPlaylistId', null);
      globals.set('selectedFolderView', { id: newId, name, trackIds: [] });
    } else {
      globals.set('selectedFolderView', null);
      globals.set('selectedPlaylistId', newId);
    }

    saveAppState();

    // — close modal immediately (save continues in background) —
    itemName = '';
    visible = false;
    onclose?.();

    // — persist library.json —
    console.time('[lib] save library.json');
    await window.electronAPI.saveLibrary({
      tracks: $state.snapshot(library.tracks),
      hierarchy: newHierarchy,
      index: newIndex,
    });
    console.timeEnd('[lib] save library.json');
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') create();
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
    <Button onclick={create}>Create</Button>
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
