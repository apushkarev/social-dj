<script>
  import LibraryTree from './lib/components/LibraryTree.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Settings from './lib/components/Settings.svelte';
  import PlaylistView from './lib/components/PlaylistView.svelte';

  const stored = localStorage.getItem('sidebar-selected-item');
  let selectedItem = $state(stored === null ? 'tree' : (stored === 'none' ? null : stored));

  let treeVisible = $derived(selectedItem === 'tree');

  $effect(() => {
    localStorage.setItem('sidebar-selected-item', selectedItem ?? 'none');
  });

  function onselect(id) {
    selectedItem = selectedItem === id ? null : id;
  }
</script>

<div class="titlebar"></div>
<div class="app-layout">
  <Sidebar {selectedItem} {onselect} />
  <div class="tree-wrapper" class:hidden={!treeVisible}>
    <div class="tree-slider">
      <LibraryTree />
    </div>
  </div>
  <main class="content">
    <PlaylistView />
    <Settings show={selectedItem === 'settings'} />
  </main>
</div>

<style>
  .titlebar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 38px;
    -webkit-app-region: drag;
    z-index: 100;

    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border2);
  }

  .app-layout {
    display: flex;
    width: 100%;
    height: calc(100% - 38px);
    margin-top: 38px;
  }

  .tree-wrapper {
    width: 400px;
    flex-shrink: 0;
    overflow: hidden;
    transition: width var(--td-250) ease;
  }

  .tree-wrapper.hidden {
    width: 0;
  }

  .tree-slider {
    width: 400px;
    height: 100%;
    transition: transform var(--td-350) ease;
  }

  .tree-wrapper.hidden .tree-slider {
    transform: translateX(-100%);
  }

  .content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
</style>
