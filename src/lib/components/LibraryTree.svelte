<script>
  import { globals } from '../globals.svelte.js';
  import TreeNode from './TreeNode.svelte';

  let library = $derived(globals.get('library'));
  let hierarchy = $derived(library ? library.hierarchy : []);

  async function loadLibrary() {
    const res = await fetch('/library.json');
    const data = await res.json();
    globals.set('library', data);
  }

  $effect(() => {
    loadLibrary();
  });
</script>

<aside class="library-tree">
  <div class="tree-scroll">
    {#if hierarchy.length > 0}
      {#each hierarchy as node (node.id)}
        <TreeNode {node} />
      {/each}
    {:else}
      <div class="loading">Loading library…</div>
    {/if}
  </div>
</aside>

<style>
  .library-tree {
    width: 400px;
    height: 100%;
    flex-shrink: 0;
    border-right: 1px solid var(--border2);
    background-color: var(--bg1);
    display: flex;
    flex-direction: column;
  }

  .tree-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 0;
  }

  .loading {
    padding: 16px;
    color: var(--fg1);
  }
</style>
