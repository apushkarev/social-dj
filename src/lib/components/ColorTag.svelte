<script>
  // Pure presentational — all color logic lives in the parent.
  let {
    color = null,
    onclick = () => {},
    onrightclick = () => {},
    playing = false
  } = $props();
  
</script>

<div
  class="tag"
  class:has-color={!!color}
  class:playing={playing}
  style={color ? `background-color: ${color};` : ''}
  onmousedown={(e) => e.stopPropagation()}
  onclick={(e) => { e.stopPropagation(); onclick(); }}
  ondblclick={(e) => e.stopPropagation()}
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
    background-color: var(--bg2);
  }

  .tag.has-color {
    border-color: transparent;
  }

  .tag:hover {
    border-color: var(--border3);
  }

  .tag.playing, .tag.has-color.playing {
    border: 2px solid var(--black4);
  }

  .tag.playing:hover, .tag.has-color.playing:hover {
    border: 2px solid var(--black3-5);
  }

  .tag.has-color:hover {
    border-color: transparent;
  }
</style>
