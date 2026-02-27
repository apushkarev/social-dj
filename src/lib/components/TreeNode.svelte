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
  import { deleteTreeItem, addTracksToPlaylist, moveTreeNode } from '../tree-management.svelte.js';
  import { dragStore } from '../drag-state.svelte.js';

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

  let isDragOver = $state(false);

  // --- Track drop (playlist nodes only) ---

  function handleDragOver(e) {
    if (!dragStore.isDragging || dragStore.sourcePlaylistId === node.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    isDragOver = true;
  }

  function handleDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    isDragOver = false;
  }

  function handleDrop(e) {
    e.preventDefault();
    const ids = dragStore.trackIds;
    if (!ids.length) return;

    isDragOver = false;
    setTimeout(() => {
      isDragOver = true;
      setTimeout(() => {
        isDragOver = false;
        addTracksToPlaylist(node.id, ids);
      }, 75);
    }, 75);
  }

  // --- Node drag (source, all nodes) ---

  function createNodeDragGhost() {
    const cs = getComputedStyle(document.documentElement);
    const bg2 = cs.getPropertyValue('--bg2').trim();
    const border3 = cs.getPropertyValue('--border3').trim();
    const fg3 = cs.getPropertyValue('--fg3').trim();

    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'top:-1000px', 'left:-1000px',
      'display:flex', 'align-items:center', 'gap:8px',
      'padding:8px 16px 8px 12px',
      `background:${bg2}`, `border:1px solid ${border3}`,
      'border-radius:8px', `color:${fg3}`,
      'font-family:inherit', 'font-size:15px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
      'pointer-events:none', 'white-space:nowrap',
    ].join(';');

    const label = node.name.length > 24 ? node.name.slice(0, 24) + '\u2026' : node.name;
    el.innerHTML = `<span style="display:flex;align-items:center">${isFolder ? icons.folder : icons.playlist}</span><span>${label}</span>`;
    return el;
  }

  function handleNodeDragStart(e) {
    e.stopPropagation();
    dragStore.startNodeDrag(node.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('application/x-tree-node', node.id);

    const ghost = createNodeDragGhost();
    document.body.appendChild(ghost);
    const ghostH = ghost.getBoundingClientRect().height;
    e.dataTransfer.setDragImage(ghost, -12, ghostH + 12);
    requestAnimationFrame(() => {
      if (document.body.contains(ghost)) document.body.removeChild(ghost);
    });
  }

  function handleNodeDragEnd() {
    dragStore.endNodeDrag();
  }

  // --- Node drop (folder nodes only) ---

  function handleFolderDragOver(e) {
    e.stopPropagation();
    const dragging = dragStore.draggingNodeId;
    if (!dragging || dragging === node.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    isDragOver = true;
  }

  function handleFolderDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    isDragOver = false;
  }

  function handleFolderDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    const dragging = dragStore.draggingNodeId;
    if (!dragging || dragging === node.id) return;

    isDragOver = false;
    setTimeout(() => {
      isDragOver = true;
      setTimeout(() => {
        isDragOver = false;
        moveTreeNode(dragging, node.id);
      }, 75);
    }, 75);
  }

  function handleContextMenu(e) {

    const node = e.currentTarget

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
    ], node, 'mouse', 'target');
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
    class:drag-over={isDragOver}
    data-snap-row
    draggable="true"
    style="padding-left: {12 + depth * 20}px"
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
    ondragstart={handleNodeDragStart}
    ondragend={handleNodeDragEnd}
    ondragover={isFolder ? handleFolderDragOver : handleDragOver}
    ondragleave={isFolder ? handleFolderDragLeave : handleDragLeave}
    ondrop={isFolder ? handleFolderDrop : handleDrop}
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
    background-color: var(--overlay3);
  }

  .node-row.selected, .node-row.folder.selected {
    background-color: var(--yellow-warm-80);
    color: var(--black4);
  }

  .node-row.selected:hover, .node-row.folder.selected:hover {
    background-color: var(--yellow-warm-80);
    color: var(--black6);
  }

  .node-row.drag-over {
    outline: 2px solid var(--meadow-green);
    outline-offset: -2px;
    border-radius: var(--brad1);
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
  .children:global(.depth-color-1)::before { background-color: var(--yellow-warm-50); }
  .children:global(.depth-color-2)::before { background-color: var(--meadow-green-50); }
  .children:global(.depth-color-3)::before { background-color: var(--mint-50); }
  .children:global(.depth-color-4)::before { background-color: var(--cornflower-blue-50); }
  .children:global(.depth-color-5)::before { background-color: var(--overlay7); }

  /* .children:global(.depth-color-0)::before { background-color: var(--red-50); }
  .children:global(.depth-color-1)::before { background-color: var(--bristol-orange-50); }
  .children:global(.depth-color-2)::before { background-color: var(--yellow-warm-50); }
  .children:global(.depth-color-3)::before { background-color: var(--meadow-green-50); }
  .children:global(.depth-color-4)::before { background-color: var(--mint-50); }
  .children:global(.depth-color-5)::before { background-color: var(--cornflower-blue-50); } */

</style>
