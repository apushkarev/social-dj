<script>
  import { icons } from '../icons.js';

  let { treeVisible, ontreeToggle } = $props();
</script>

<nav class="sidebar">
  <button
    class="sidebar-item"
    class:selected={treeVisible}
    onclick={ontreeToggle}
    title="Library Tree"
  >
    {@html icons.tree}
  </button>
</nav>

<style>
  .sidebar {
    width: 64px;
    height: 100%;
    flex-shrink: 0;
    border-right: 1px solid var(--border2);
    display: flex;
    flex-direction: column;
  }

  .sidebar-item {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    border-left: 2px solid transparent;
    cursor: pointer;
    color: var(--fg1);
    padding: 0;
    transition: color var(--td-100), border-left-color var(--td-100);
  }

  .sidebar-item:hover {
    color: var(--fg3);
    border-left-color: var(--fg3);
  }

  .sidebar-item:active {
    color: var(--fg5);
    border-left-color: var(--fg5);
  }

  .sidebar-item.selected {
    color: var(--yellow-warm);
    border-left-color: var(--yellow-warm);
  }

  .sidebar-item.selected:active {
    color: var(--yellow-cool);
    border-left-color: var(--yellow-cool);
  }

  .sidebar-item.selected:hover {
    color: var(--yellow-warm);
    border-left-color: var(--yellow-warm);
  }
</style>
