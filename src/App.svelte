<script>
  import LibraryTree from './lib/components/LibraryTree.svelte';
  import Sidebar from './lib/components/Sidebar.svelte';
  import Settings from './lib/components/Settings.svelte';
  import PlaylistView from './lib/components/PlaylistView.svelte';
  import { globals } from './lib/globals.svelte.js';
  import ContextMenu from './lib/components/ContextMenu.svelte';
  import { saveAppState } from './lib/app-state.svelte.js';

  const stored = globals.get('sidebar-selected-item');
  let selectedItem = $state(stored === null ? 'tree' : (stored === 'none' ? null : stored));
  let prevSelectedItem = $derived(globals.get('prev-sidebar-selected-item'));

  let treeVisible = $derived(selectedItem === 'tree');
  let prevTreeVisible = $state(true);

  let sliderEl = $state();

  $effect(() => {
    globals.set('sidebar-selected-item', selectedItem ?? 'none');
    saveAppState();
  });

  // Keep --font-size in sync with globals reactively
  $effect(() => {
    document.documentElement.style.setProperty('--font-size', (globals.get('fontSize') ?? 16) + 'px');
  });

  function handleSelectSidebarModule(id) {

    let prev = selectedItem;

    if (selectedItem == 'settings' && id == 'settings') {

      selectedItem = prevSelectedItem;
    
    } else if (selectedItem != 'settings' && selectedItem == id) {

      selectedItem = null;
    
    } else if (selectedItem != id) {

      selectedItem = id;
    }

    globals.set('prev-sidebar-selected-item', prev);
  }

  // Auto tree width
  const storedWidth = $derived(globals.get('tree-width'));
  let treeWidth = $state(storedWidth ? parseInt(String(storedWidth), 10) : 400);

  function handleTreeWidth(newWidth) {
    // Always wait for the 200ms slide transition to finish before resizing,
    // whether opening (grow) or closing (shrink).

    if (sliderEl) sliderEl.style.removeProperty('width');

    requestAnimationFrame(() => {
      treeWidth = newWidth;
      globals.set('tree-width', newWidth);
      saveAppState();
    })
  }

  $effect(() => {

    if (prevTreeVisible == treeVisible) return;

    if (!treeVisible) {
      setTimeout(() => treeWidth = 0, 0);
    }

    if (treeVisible) treeWidth = storedWidth;

    prevTreeVisible = treeVisible;
  });

</script>

<ContextMenu />
<div class="titlebar"></div>
<div class="app-layout">
  <Sidebar {selectedItem} onselect={handleSelectSidebarModule} />
  <div
    class="tree-wrapper"
    class:hidden={!treeVisible}
    style="
      width: {treeWidth}px;      
    "
  >
    <div
      bind:this={sliderEl}
      class="tree-slider"
    >
      <LibraryTree onwidthchange={handleTreeWidth} />
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
    /* width is set via inline style:width when visible; .hidden overrides to 0.
       Setting it directly (not via CSS var) ensures the CSS transition fires. */
    flex-shrink: 0;
    overflow: hidden;
    
    transition: width var(--td-250) ease-in-out, transform var(--td-250) ease-in-out;
  }


  .tree-slider {
    height: 100%;
    width: 100%;
  }

  .tree-wrapper.hidden {
    transform: translateX(calc(-100% - 64px));
  }

  .content {
    flex: 1;
    height: 100%;
    overflow: hidden;
    position: relative;
  }
</style>
