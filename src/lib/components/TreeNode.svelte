<script>
  import { slide } from 'svelte/transition';
  import { icons } from '../icons.js';
  import { treeState } from '../tree-state.svelte.js';
  import TreeNode from './TreeNode.svelte';

  let {
    node,
    depth = 0,
  } = $props();

  let isFolder = $derived(node.type === 'folder');
  let isOpen = $derived(isFolder && treeState.isOpen(node.id));
  let hasChildren = $derived(isFolder && node.children && node.children.length > 0);

  function toggle() {
    if (isFolder) {
      treeState.toggle(node.id);
    }
  }
</script>

<div class="tree-node">
  <button
    class="node-row"
    class:folder={isFolder}
    class:playlist={!isFolder}
    data-snap-row
    style="padding-left: {12 + depth * 20}px"
    onclick={toggle}
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
  </button>

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
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 28px;
    border: none;
    background: none;
    color: var(--fg3);
    font-family: inherit;
    font-size: 14px;
    font-weight: 400;
    cursor: pointer;
    padding-right: 12px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    transition: background-color var(--td-100);
  }

  .node-row:hover {
    background-color: var(--overlay1);
  }

  .node-row.folder {
    color: var(--fg4);
    font-weight: 500;
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
    color: var(--fg3);
  }

  .arrow.open {
    transform: rotate(-90deg);
  }

  .icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--fg3);
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
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
  .children:global(.depth-color-3)::before { background-color: var(--mint-50); }
  .children:global(.depth-color-4)::before { background-color: var(--meadow-green-50); }
  .children:global(.depth-color-5)::before { background-color: var(--cornflower-blue-50); }

</style>
