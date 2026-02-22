<script>
  import { colorTags } from '../color-tags.svelte.js';

  let { trackId, onopen } = $props();

  let color = $derived(colorTags.get(String(trackId)));
  let el;

  function handleClick() {
    onopen(trackId, el.getBoundingClientRect());
  }
</script>

<div
  class="tag"
  class:has-color={!!color}
  style={color ? `background-color: ${color};` : ''}
  bind:this={el}
  onmousedown={(e) => e.stopPropagation()}
  onclick={handleClick}
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
