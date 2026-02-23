<script>
  import { colorTags } from '../color-tags.svelte.js';

  let { trackId, onopen = () => {}, onclose = () => {} } = $props();

  const CYCLE = [
    null,
    'var(--red)',
    'var(--bristol-orange)',
    'var(--yellow-warm)',
    'var(--meadow-green)',
    'var(--mint)',
    'var(--cornflower-blue)',
  ];

  let color = $derived(colorTags.get(String(trackId)));

  function handleClick() {
    const idx = CYCLE.indexOf(color);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    colorTags.set(String(trackId), next);
  }

  function handleContextMenu(e) {
    e.preventDefault();
    colorTags.set(String(trackId), null);
  }
  
</script>

<div
  class="tag"
  class:has-color={!!color}
  style={color ? `background-color: ${color};` : ''}
  onmousedown={(e) => e.stopPropagation()}
  onclick={handleClick}
  oncontextmenu={handleContextMenu}
></div>

<style>
  .tag {
    width: 24px;
    height: 24px;
    border-radius: var(--brad1);
    border: 2px solid var(--border2);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color var(--td-100);
  }

  .tag.has-color {
    border-color: transparent;
  }

  .tag:hover {
    border-color: var(--border3);
  }

  .tag.has-color:hover {
    border-color: transparent;
  }
</style>
