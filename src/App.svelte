<script>
  import LibraryTree from './lib/components/LibraryTree.svelte';
</script>

<div class="titlebar"></div>
<div class="app-layout">
  <LibraryTree />
  <main class="content">
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

  .content {
    flex: 1;
    height: 100%;
    overflow: hidden;
  }
</style>
