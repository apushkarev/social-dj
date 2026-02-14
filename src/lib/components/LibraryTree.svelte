<script>
  import { globals } from '../globals.svelte.js';
  import TreeNode from './TreeNode.svelte';

  let library = $derived(globals.get('library'));
  let hierarchy = $derived(library ? library.hierarchy : []);

  let scrollEl;
  let stopTimeout;
  let isSnapping = false;
  let accumulatedDelta = 0;
  let wheelSamples = [];

  let discreteScrolling = $state(
    localStorage.getItem('discreteScrolling') === 'true'
  );

  const VELOCITY_WINDOW = 100;
  const SLOW_THRESHOLD = 100;
  const STEP_THRESHOLD = 20;
  const SNAP_DELAY = 75;

  async function loadLibrary() {
    const res = await fetch('/library.json');
    const data = await res.json();
    globals.set('library', data);
  }

  $effect(() => {
    loadLibrary();
  });

  $effect(() => {
    if (!scrollEl || !discreteScrolling) return;
    scrollEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => scrollEl.removeEventListener('wheel', handleWheel);
  });

  function getRowOffsets() {
    const rows = scrollEl.querySelectorAll('[data-snap-row]');
    const containerRect = scrollEl.getBoundingClientRect();
    const st = scrollEl.scrollTop;
    return Array.from(rows, row => {
      return row.getBoundingClientRect().top - containerRect.top + st;
    });
  }

  function findNearest(offsets, scrollTop) {

    let best = offsets[0];
    let bestDist = Math.abs(scrollTop - best);
    for (const pos of offsets) {
      const dist = Math.abs(scrollTop - pos);
      if (dist < bestDist) {
        bestDist = dist;
        best = pos;
      }
    }

    return best;
  }

  function findNext(offsets, scrollTop, direction) {
    if (direction > 0) {
      for (const pos of offsets) {
        if (pos > scrollTop + 2) return pos;
      }
      return offsets[offsets.length - 1];
    } else {
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (offsets[i] < scrollTop - 2) return offsets[i];
      }
      return offsets[0];
    }
  }

  function smoothScroll(target) {
    isSnapping = true;
    scrollEl.scrollTo({ top: target, behavior: 'smooth' });
    setTimeout(() => { isSnapping = false; }, 200);
  }

  function snapToNearest() {
    if (isSnapping) return;
    const offsets = getRowOffsets();
    if (!offsets.length) return;
    const target = findNearest(offsets, scrollEl.scrollTop);
    if (Math.abs(scrollEl.scrollTop - target) < 2) return;
    smoothScroll(target);
  }

  function stepRow(direction) {
    if (isSnapping) return;
    const offsets = getRowOffsets();
    if (!offsets.length) return;
    smoothScroll(findNext(offsets, scrollEl.scrollTop, direction));
  }

  function handleWheel(e) {
    e.preventDefault();

    const now = Date.now();
    wheelSamples.push({ delta: e.deltaY, time: now });
    wheelSamples = wheelSamples.filter(s => now - s.time < VELOCITY_WINDOW);

    const velocity = wheelSamples.reduce((sum, s) => sum + Math.abs(s.delta), 0);
    const isSlow = velocity < SLOW_THRESHOLD;

    if (isSlow) {
      accumulatedDelta += e.deltaY;
      if (Math.abs(accumulatedDelta) >= STEP_THRESHOLD) {
        stepRow(accumulatedDelta > 0 ? 1 : -1);
        accumulatedDelta = 0;
      }
    } else {
      scrollEl.scrollTop += e.deltaY;
      accumulatedDelta = 0;
    }

    clearTimeout(stopTimeout);
    stopTimeout = setTimeout(() => {
      snapToNearest();
      wheelSamples = [];
      accumulatedDelta = 0;
    }, SNAP_DELAY);
  }
</script>

<aside class="library-tree">
  <div class="tree-scroll" bind:this={scrollEl}>
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
