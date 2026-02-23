<script>
  // Pure presentational — all color logic lives in the parent.
  let { color = null, onclick = () => {}, onrightclick = () => {} } = $props();
</script>

<div
  class="tag"
  class:has-color={!!color}
  style={color ? `background-color: ${color};` : ''}
  onmousedown={(e) => e.stopPropagation()}
  onclick={(e) => { e.stopPropagation(); onclick(); }}
  oncontextmenu={(e) => { e.preventDefault(); e.stopPropagation(); onrightclick(); }}
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
