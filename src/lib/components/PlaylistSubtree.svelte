<script>
  import { icons } from '../icons.js';
  import { globals } from '../globals.svelte.js';

  // Read-only mirror of LibraryTree: no heading, no node actions, no drag and
  // no collapse — every folder on the way to a match is always open. Folders are
  // inert structure; only playlists are clickable.
  let { hierarchy = [], onselect = undefined } = $props();

  let selectedPlaylistId = $derived(globals.get('selectedPlaylistId'));
</script>

{#snippet treeNode(node, depth)}
  {#if node.type === 'playlist'}

    <button
      class="node-row playlist"
      class:selected={selectedPlaylistId === node.id}
      style="padding-left: {12 + depth * 20}px"
      onclick={() => onselect?.(node)}
    >
      <span class="icon">{@html icons.playlist}</span>
      <span class="label">{node.name}</span>
    </button>

  {:else}

    <div class="node-row folder" style="padding-left: {12 + depth * 20}px">
      <span class="arrow open">{@html icons.arrowLeft}</span>
      <span class="icon">{@html icons.folder}</span>
      <span class="label">{node.name}</span>
    </div>

    {#if node.children?.length}
      <div class="children depth-color-{depth % 6}" style="--guide-left: {20 + depth * 20}px">
        {#each node.children as child (child.id)}
          {@render treeNode(child, depth + 1)}
        {/each}
      </div>
    {/if}

  {/if}
{/snippet}

<div class="subtree">
  {#each hierarchy as node (node.id)}
    {@render treeNode(node, 0)}
  {/each}
</div>

<style>
  .subtree {
    padding: 0.25em 0;
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
    padding-right: 12px;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    transition: background-color var(--td-100);
  }

  .node-row.playlist {
    cursor: pointer;
  }

  .node-row.playlist:hover {
    background-color: var(--overlay3);
  }

  .node-row.playlist.selected {
    background-color: var(--overlay5);
    color: var(--fg3-s);
  }

  .node-row.playlist.selected:hover {
    background-color: var(--overlay6);
  }

  /* Folders are structural only — no pointer affordance. */
  .node-row.folder {
    color: var(--fg2-s);
    font-weight: 600;
    cursor: default;
  }

  .arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    transform: rotate(-180deg);
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

  .selected .icon {
    color: var(--fg3-s);
  }

  .label {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 500;
  }

  .selected .label {
    font-weight: 600;
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

  .children.depth-color-0::before { background-color: var(--red-50); }
  .children.depth-color-1::before { background-color: var(--yellow-warm-50); }
  .children.depth-color-2::before { background-color: var(--meadow-green-50); }
  .children.depth-color-3::before { background-color: var(--mint-50); }
  .children.depth-color-4::before { background-color: var(--cornflower-blue-50); }
  .children.depth-color-5::before { background-color: var(--overlay7); }
</style>
