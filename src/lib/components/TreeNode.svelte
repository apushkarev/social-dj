<script>
  import { slide } from 'svelte/transition';
  import { icons } from '../icons.js';
  import { treeState } from '../tree-state.svelte.js';
  import { globals } from '../globals.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import TreeNode from './TreeNode.svelte';
  import AddTreeItem from './AddTreeItem.svelte';
  import RenameTreeItem from './RenameTreeItem.svelte';
  import { contextMenu } from '../context-menu.svelte.js';
  import { deleteTreeItem } from '../tree-management.svelte.js';

  let {
    node,
    depth = 0
  } = $props();

  let isFolder = $derived(node.type === 'folder');
  let isOpen = $derived(isFolder && treeState.isOpen(node.id));
  let hasChildren = $derived(isFolder && node.children && node.children.length > 0);
  let isSelected = $derived(
    isFolder
      ? globals.get('selectedFolderView')?.id === node.id
      : globals.get('selectedPlaylistId') === node.id
  );

  // Recursively collect unique track IDs from all playlists in a subtree.
  // Uses insertion order for deduplication (Set preserves it).
  function collectFolderTrackIds(n) {
    const seen = new Set();
    function recurse(node) {
      if (node.type === 'playlist') {
        for (const id of (node.trackIds ?? [])) seen.add(String(id));
      } else if (node.children) {
        for (const child of node.children) recurse(child);
      }
    }
    recurse(n);
    return [...seen];
  }

  let showModal = $state(false);
  let modalType = $state('playlist');
  let modalX = $state(0);
  let modalY = $state(0);

  let showRenameModal = $state(false);
  let contextX = $state(0);
  let contextY = $state(0);

  function handleContextMenu(e) {
    e.preventDefault();
    contextX = e.clientX;
    contextY = e.clientY;

    contextMenu.show(e.clientX, e.clientY, [
      {
        icon: 'edit',
        text: 'Rename',
        callback: () => { showRenameModal = true; },
      },
      { type: 'separator' },
      {
        icon: 'trash',
        text: 'Delete',
        callback: handleDelete,
      },
    ]);
  }

  async function handleDelete() {
    await deleteTreeItem(node.id);

    if (globals.get('selectedPlaylistId') === node.id) {
      globals.set('selectedPlaylistId', null);
      saveAppState();
    }

    if (globals.get('selectedFolderView')?.id === node.id) {
      globals.set('selectedFolderView', null);
      saveAppState();
    }
  }

  function handleAddFolder(e) {
    e.stopPropagation();
    modalType = 'folder';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleAddPlaylist(e) {
    e.stopPropagation();
    modalType = 'playlist';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleClick(e) {

    if (isFolder) {
      if (e.altKey) {
        globals.set('selectedPlaylistId', null);
        globals.set('selectedFolderView', {
          id: node.id,
          name: node.name,
          trackIds: collectFolderTrackIds(node),
        });
        saveAppState();
      } else {
        treeState.toggle(node.id);
      }
    } else {
      globals.set('selectedFolderView', null);
      globals.set('selectedPlaylistId', node.id);
      saveAppState();
    }
  }
</script>

<div class="tree-node">
  <button
    class="node-row"
    class:folder={isFolder}
    class:playlist={!isFolder}
    class:selected={isSelected}
    data-snap-row
    style="padding-left: {12 + depth * 20}px"
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
  >
    {#if isFolder}
      <span class="arrow" class:open={isOpen}>
        {@html icons.arrowLeft}
      </span>
    {/if}

    <span class="icon">
      {@html isFolder ? icons.folder : icons.playlist}
    </span>

    <span class="label">{node.name}</span>

    {#if isFolder}
      <span class="node-actions" onclick={e => e.stopPropagation()}>
        <span class="action-icon" onclick={handleAddPlaylist}>{@html icons.addPlaylist}</span>
        <span class="action-icon" onclick={handleAddFolder}>{@html icons.addFolder}</span>
      </span>
    {/if}
  </button>

{#if isFolder}
  <AddTreeItem
    type={modalType}
    parentFolderId={node.id}
    parentFolderName={node.name}
    x={modalX}
    y={modalY}
    bind:visible={showModal}
  />
{/if}

<RenameTreeItem
  nodeId={node.id}
  nodeName={node.name}
  x={contextX}
  y={contextY}
  bind:visible={showRenameModal}
/>

  {#if isFolder && isOpen && hasChildren}
    <div
      class="children depth-color-{depth % 6}"
      style="--guide-left: {20 + depth * 20}px"
      transition:slide={{ duration: 200 }}
    >
      {#each node.children as child (child.id)}
        <TreeNode node={child} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    width: 100%;
    padding: 0.125em 0;
  }

  .node-row {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 28px;
    border: none;
    background: none;
    color: var(--fg2-s);
    font-family: inherit;
    font-size: 0.875em;
    font-weight: 400;
    cursor: pointer;
    padding-right: 12px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    transition: background-color var(--td-100);
  }

  .node-row:hover, .node-row.folder:hover {
    background-color: var(--overlay1);
  }

  .node-row.selected, .node-row.folder.selected {
    background-color: var(--yellow-warm-80);
    color: var(--black4);
  }

  .node-row.selected:hover, .node-row.folder.selected:hover {
    background-color: var(--yellow-warm-80);
    color: var(--black6);
  }

  .node-row.folder {
    color: var(--fg2-s);
    font-weight: 600;
  }

  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transform: rotate(-180deg);
    transition: transform var(--td-250);
    color: var(--fg2-s);
  }

  .arrow.open {
    transform: rotate(-90deg);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--fg2-s);
  }

  .selected .icon, .selected .arrow {
    color: var(--black4);
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .selected .label {
    font-weight: 600;
  }

  .node-actions {
    position: absolute;
    right: 0.75em;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 1em;
    opacity: 0;
    transition: opacity var(--td-100);
    pointer-events: none;
  }

  .node-row:hover .node-actions {
    opacity: 1;
    pointer-events: auto;
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg2-s);
    cursor: pointer;
  }

  .selected .action-icon {
    color: var(--black3);
  }

  .action-icon:hover {
    color: var(--fg3-s);
  }

  .action-icon:active {
    color: var(--fg5-s);
  }

  .selected .action-icon:hover {
    color: var(--black3-5);
  }

  .selected .action-icon:active {
    color: var(--black4);
  }

  .children {
    width: 100%;
    position: relative;
  }

  .children::before {
    content: '';
    position: absolute;
    left: var(--guide-left);
    top: 0;
    bottom: 0;
    width: 1px;
  }

  .children:global(.depth-color-0)::before { background-color: var(--red-50); }
  .children:global(.depth-color-1)::before { background-color: var(--bristol-orange-50); }
  .children:global(.depth-color-2)::before { background-color: var(--yellow-warm-50); }
  .children:global(.depth-color-3)::before { background-color: var(--meadow-green-50); }
  .children:global(.depth-color-4)::before { background-color: var(--mint-50); }
  .children:global(.depth-color-5)::before { background-color: var(--cornflower-blue-50); }

</style>
