<script>
  import { globals } from '../globals.svelte.js';
  import { treeState } from '../tree-state.svelte.js';
  import TreeNode from './TreeNode.svelte';
  import LibraryHeading from './LibraryHeading.svelte';
  import { saveAppState } from '../app-state.svelte.js';
  import { dragStore } from '../drag-state.svelte.js';
  import { moveTreeNodeToRoot, sortRootLevel, rebuildIndex } from '../tree-management.svelte.js';

  let { onwidthchange = undefined } = $props();

  let library = $derived(globals.get('library'));
  let hierarchy = $derived(library ? library.hierarchy : []);

  // Icon/layout constants matching TreeNode.svelte
  const ARROW_W = 16;  // arrowLeft SVG width
  const ICON_W  = 18;  // folder / playlist SVG width
  const GAP     = 6;   // flex gap inside .node-row
  const PAD_R   = 12;  // padding-right on .node-row
  const EXTRA   = 64;  // 2em safety margin requested by formula
  const MIN_W   = 200;

  let _measureCtx = null;
  function getMeasureCtx() {
    if (!_measureCtx) {
      _measureCtx = document.createElement('canvas').getContext('2d');
    }
    return _measureCtx;
  }

  function calcNodeWidth(node, depth) {

    const ctx      = getMeasureCtx();

    const padLeft  = 12 + depth * 20;

    const isFolder = node.type === 'folder';

    ctx.font       = `${isFolder ? 600 : 500} 14px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
    
    const textW    = ctx.measureText(node.name).width;
    const icons    = isFolder
      ? ARROW_W + GAP + ICON_W + GAP   // arrow + gap + icon + gap
      : ICON_W + GAP;                  // icon + gap

    let maxW = padLeft + icons + textW + PAD_R + (isFolder ? EXTRA : 0); 

    if (isFolder && treeState.isOpen(node.id) && node.children?.length) {

      for (const child of node.children) {
        maxW = Math.max(maxW, calcNodeWidth(child, depth + 1));
      }
    }
    return maxW;
  }

  $effect(() => {

    if (!hierarchy.length || !onwidthchange) return;

    let maxW = MIN_W;

    for (const node of hierarchy) {
      maxW = Math.max(maxW, calcNodeWidth(node, 0));
    }

    onwidthchange(Math.ceil(maxW));
  });

  let scrollEl = $state(null);
  let stopTimeout = $state(null);

  // Root-level drop target
  let isRootDragOver = $state(false);
  let _rootDragTimer = null;

  function handleScrollDragOver(e) {
    if (!dragStore.draggingNodeId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    isRootDragOver = true;
    clearTimeout(_rootDragTimer);
    _rootDragTimer = setTimeout(() => { isRootDragOver = false; }, 80);
  }

  function handleScrollDrop(e) {
    e.preventDefault();
    clearTimeout(_rootDragTimer);
    const nodeId = dragStore.draggingNodeId;
    if (!nodeId) return;

    isRootDragOver = false;
    setTimeout(() => {
      isRootDragOver = true;
      setTimeout(() => {
        isRootDragOver = false;
        moveTreeNodeToRoot(nodeId);
      }, 75);
    }, 75);
  }

  // Scroll position persistence
  let _saveScrollTimer = $state(null);
  let _scrollRestored = $state(false);

  function handleScroll() {

    clearTimeout(_saveScrollTimer);

    _saveScrollTimer = setTimeout(() => {

      globals.set('tree-scroll-pos', scrollEl.scrollTop);
      saveAppState();
    }, 150);
  }

  // Restore once after hierarchy first loads
  $effect(() => {

    if (!scrollEl || !hierarchy.length || _scrollRestored) return;

    _scrollRestored = true;

    const saved = globals.get('tree-scroll-pos');

    if (saved !== null) scrollEl.scrollTop = Number(saved);
  });

  // Attach scroll listener
  $effect(() => {

    if (!scrollEl) return;

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });

    return () => scrollEl.removeEventListener('scroll', handleScroll);
  });

  let isSnapping = false;
  let accumulatedDelta = 0;
  let wheelSamples = [];

  const _ds = globals.get('discreteScrolling');
  let discreteScrolling = $state(_ds === true || _ds === 'true');

  const VELOCITY_WINDOW = 100;
  const SLOW_THRESHOLD = 100;
  const STEP_THRESHOLD = 20;
  const SNAP_DELAY = 75;

  async function loadLibrary() {

    const [tracksRes, hierarchyRes] = await Promise.all([
      fetch('/library/tracks.json'),
      fetch('/library/hierarchy.json'),
    ]);

    const { tracks } = await tracksRes.json();
    const { hierarchy } = await hierarchyRes.json();

    sortRootLevel(hierarchy);

    globals.set('library', { tracks, hierarchy, index: rebuildIndex(hierarchy) });
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
  <div
    class="tree-scroll"
    class:root-drag-over={isRootDragOver}
    bind:this={scrollEl}
    ondragover={handleScrollDragOver}
    ondrop={handleScrollDrop}
  >
    <LibraryHeading />

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
    width: 100%;
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
    padding-bottom: 4px;
  }

  .loading {
    padding: 16px;
    color: var(--fg1);
  }

  .tree-scroll.root-drag-over {
    /* box-shadow: inset 0 -3px 0 var(--meadow-green); */
    outline: 2px solid var(--meadow-green-50);
    outline-offset: -2px;
    border-radius: var(--brad1);
  }
</style>
