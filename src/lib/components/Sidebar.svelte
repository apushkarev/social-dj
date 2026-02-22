<script>
  import { icons } from '../icons.js';

  let { selectedItem, onselect } = $props();

  const items = [
    { id: 'tree',         icon: 'sibebarTree',     title: 'Library Tree' },
    { id: 'competitions', icon: 'sidebarTrophy',   title: 'Competitions' },
    { id: 'settings',    icon: 'sidebarSettings', title: 'Settings' },
  ];
</script>

<nav class="sidebar">
  {#each items as item}
    <button
      class="sidebar-item"
      class:selected={selectedItem === item.id}
      onclick={() => onselect(item.id)}
      title={item.title}
    >
      {@html icons[item.icon]}
    </button>
  {/each}
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
    color: var(--fg1-s);
    padding: 0;
    transition: color var(--td-100), border-left-color var(--td-100);
  }

  .sidebar-item:hover {
    color: var(--fg3-s);
    border-left-color: var(--fg3-s);
  }

  .sidebar-item:active {
    color: var(--fg5-s);
    border-left-color: var(--fg5-s);
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
