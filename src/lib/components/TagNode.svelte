<script>
  import { slide } from 'svelte/transition';
  import { icons } from '../icons.js';
  import { tagState } from '../tag-state.svelte.js';
  import { globals } from '../globals.svelte.js';
  import { contextMenu } from '../context-menu.svelte.js';
  import { deleteTagItem } from '../tag-management.svelte.js';
  import AddTagItem from './AddTagItem.svelte';
  import RenameTagItem from './RenameTagItem.svelte';
  import TagNode from './TagNode.svelte';

  let {
    node,
    depth = 0
  } = $props();

  let isGroup = $derived(node.type === 'tag-group');
  let isOpen = $derived(isGroup && tagState.isOpen(node.id));
  let hasChildren = $derived(isGroup && node.children && node.children.length > 0);
  let isSelected = $derived(globals.get('selectedTagId') === node.id);

  let showModal = $state(false);
  let modalX = $state(0);
  let modalY = $state(0);

  let showRenameModal = $state(false);
  let contextX = $state(0);
  let contextY = $state(0);

  function handleClick() {

    if (isGroup) {
      tagState.toggle(node.id);
    }

    globals.set('selectedTagId', node.id);
  }

  function handleAddTag(e) {
    e.stopPropagation();
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleContextMenu(e) {
    const btn = e.currentTarget;

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
    ], btn, 'mouse', 'target');
  }

  function handleDelete() {
    deleteTagItem(node.id);

    if (globals.get('selectedTagId') === node.id) {
      globals.set('selectedTagId', null);
    }
  }
</script>

<div class="tag-node">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="node-row"
    class:group={isGroup}
    class:tag={!isGroup}
    class:selected={isSelected}
    data-snap-row
    style="padding-left: {12 + depth * 20}px"
    onclick={handleClick}
    oncontextmenu={handleContextMenu}
  >
    {#if isGroup}
      <span class="arrow" class:open={isOpen}>
        {@html icons.arrowLeft}
      </span>
    {/if}

    <span class="icon">
      {@html isGroup ? icons.folder : icons.tag}
    </span>

    <span class="label">
      {node.name}{#if !isGroup && node.tracks !== undefined}<span class="track-count"> ({node.tracks.length})</span>{/if}
    </span>

    {#if isGroup}
      <span class="node-actions" onclick={e => e.stopPropagation()}>
        <span class="action-icon" title="Add tag" onclick={handleAddTag}>
          {@html icons.addPlaylist}
        </span>
      </span>
    {/if}
  </div>

  {#if isGroup}
    <AddTagItem
      type="tag"
      parentGroupId={node.id}
      parentGroupName={node.name}
      x={modalX}
      y={modalY}
      bind:visible={showModal}
    />
  {/if}

  <RenameTagItem
    tagId={node.id}
    tagName={node.name}
    x={contextX}
    y={contextY}
    bind:visible={showRenameModal}
  />

  {#if isGroup && isOpen && hasChildren}
    <div
      class="children depth-color-{depth % 6}"
      style="--guide-left: {20 + depth * 20}px"
      transition:slide={{ duration: 200 }}
    >
      {#each node.children as child (child.id)}
        <TagNode node={child} depth={depth + 1} />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tag-node {
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
    box-sizing: border-box;
  }

  .node-row:hover {
    background-color: var(--overlay3);
  }

  .node-row.selected {
    background-color: var(--overlay5);
    color: var(--fg3-s);
  }

  .node-row.selected:hover {
    background-color: var(--overlay6);
  }

  .node-row.group {
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
    flex-shrink: 0;
  }

  .label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .track-count {
    opacity: 0.8;
    font-size: 0.9em;
    margin-left: 0.25em;
  }

  .node-actions {
    position: absolute;
    right: 0.75em;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    gap: 0.75em;
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

    transition: color var(--td-100);
  }

  .node-row.selected .action-icon {
    color: var(--fg4-s);
  }

  .action-icon:hover {
    color: var(--fg3-s);
  }

  .action-icon:active {
    color: var(--fg5-s);
  }

  .node-row.selected .action-icon:hover {
    color: var(--fg6-s);
  }

  .children {
    width: 100%;
  }
</style>
