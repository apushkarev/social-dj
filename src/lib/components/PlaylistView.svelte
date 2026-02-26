<script>
  import { globals } from '../globals.svelte.js';
  import { colorTags } from '../color-tags.svelte.js';
  import { dragStore } from '../drag-state.svelte.js';
  import { removeTracksFromPlaylist } from '../tree-management.svelte.js';
  import { contextMenu } from '../context-menu.svelte.js';
  import ColorTag from './ColorTag.svelte';

  let library            = $derived(globals.get('library'));
  let selectedPlaylistId = $derived(globals.get('selectedPlaylistId'));
  let selectedFolderView = $derived(globals.get('selectedFolderView'));

  let selectedTrackIds = $state(new Set());
  let anchorTrackId = $state(null);

  $effect(() => {
    selectedPlaylistId;
    selectedFolderView;
    selectedTrackIds = new Set();
    anchorTrackId = null;
  });

  const CYCLE = [
    null,
    'var(--red)',
    'var(--bristol-orange)',
    'var(--yellow-warm)',
    'var(--meadow-green)',
    'var(--mint)',
    'var(--cornflower-blue)',
  ];

  function nextColor(trackId) {

    const idx = CYCLE.indexOf(colorTags.get(String(trackId)));

    return CYCLE[(idx + 1) % CYCLE.length];
  }

  function handleTagLeftClick(trackId) {

    if (selectedTrackIds.has(trackId)) {

      const next = nextColor(trackId);
      for (const id of selectedTrackIds) colorTags.set(String(id), next);

    } else {

      selectedTrackIds = new Set();
      colorTags.set(String(trackId), nextColor(trackId));
    }
  }

  function handleTagRightClick(trackId) {

    if (selectedTrackIds.has(trackId)) {

      for (const id of selectedTrackIds) colorTags.set(String(id), null);

    } else {

      selectedTrackIds = new Set();
      colorTags.set(String(trackId), null);
    }
  }

  function handleRowClick(e, trackId) {

    if (e.shiftKey && anchorTrackId) {

      e.preventDefault();

      const anchorIdx = tracks.findIndex(t => t.trackId === anchorTrackId);
      const clickIdx  = tracks.findIndex(t => t.trackId === trackId);

      if (anchorIdx !== -1 && clickIdx !== -1) {

        const lo = Math.min(anchorIdx, clickIdx);
        const hi = Math.max(anchorIdx, clickIdx);

        selectedTrackIds = new Set(tracks.slice(lo, hi + 1).map(t => t.trackId));
      }
      // anchor stays fixed so further shift+clicks extend from the same point

    } else if (e.metaKey || e.ctrlKey) {

      const next = new Set(selectedTrackIds);

      if (next.has(trackId)) next.delete(trackId); else next.add(trackId);

      selectedTrackIds = next;
      anchorTrackId = trackId;

    } else if (selectedTrackIds.has(trackId)) {

      selectedTrackIds = new Set();
      anchorTrackId = null;

    } else {

      selectedTrackIds = new Set([trackId]);
      anchorTrackId = trackId;
    }
  }

  $effect(() => {

    function handleKeyDown(e) {

      if (!(e.metaKey || e.ctrlKey) || e.key !== 'a') return;
      if (!tracks.length) return;

      e.preventDefault();

      if (selectedTrackIds.size === tracks.length) {
        selectedTrackIds = new Set();
      } else {
        selectedTrackIds = new Set(tracks.map(t => t.trackId));
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  });

  function getNodeById(lib, id) {

    if (!lib?.index || !id) return null;

    const path = lib.index[id];

    if (!path) return null;

    let node = { children: lib.hierarchy };

    for (const i of path) {

      node = node.children[i];
      if (!node) return null;
    }

    return node;
  }

  // Returns an array of node names from root down to nodeId.
  function getBreadcrumbPath(lib, nodeId) {

    if (!lib?.index || !nodeId) return null;

    const path = lib.index[nodeId];

    if (!path) return null;

    const names = [];
    let node = { children: lib.hierarchy };

    for (const i of path) {

      node = node.children[i];
      if (!node) return null;

      names.push(node.name);
    }
    return names;
  }

  const branchSteps = $state(3);
  const delimiter = $state(' • ');

  // Shows last 3 nodes; prefixes with '... / ' when path is deeper.
  function formatBreadcrumb(names) {

    const branchSteps = 3;
    const delimiter = ' • ';

    if (!names || names.length === 0) return null;
    if (names.length <= branchSteps) return names.join(delimiter);

    return '...' + delimiter + names.slice(-branchSteps).join(delimiter);
  }

  function calcBreadcrumbs() {

    let names = [];

    if (selectedFolderView) {
      
      names = getBreadcrumbPath(library, selectedFolderView.id);

      if (names) return names.slice(-branchSteps);

      return [selectedFolderView.name];
    }
    if (playlist?.type === 'playlist') {

      names = getBreadcrumbPath(library, selectedPlaylistId);

      if (names) return names.slice(-branchSteps);

      return [playlist.name];
    }

    return [];
  }

  let playlist = $derived(getNodeById(library, selectedPlaylistId));

  // Effective view: folder aggregation takes priority over single playlist
  let breadcrumbs = $derived(calcBreadcrumbs());

  let activeTrackIds = $derived(
    selectedFolderView?.trackIds
    ?? (playlist?.type === 'playlist' ? playlist.trackIds : null)
  );

  let tracks = $derived(
    activeTrackIds
      ?.map(id => library?.tracks[String(id)])
      .filter(Boolean) ?? []
  );

  let numColWidth = $derived(
    `${Math.floor(Math.log10(Math.max(tracks.length, 1))) + 1}rem`
  );

  let tooltipComment = $state(null);
  let tooltipTop = $state(0);

  function handleCommentEnter(e, comment) {
    if (!comment) return;
    tooltipComment = comment;
    tooltipTop = e.currentTarget.getBoundingClientRect().top;
  }

  function handleCommentLeave() {
    tooltipComment = null;
  }

  function createDragGhost(count) {
    const cs = getComputedStyle(document.documentElement);
    const yellow = cs.getPropertyValue('--yellow-warm').trim();

    const el = document.createElement('div');
    el.id = 'drag-badge';
    el.style.cssText = [
      'position: fixed',
      'top: -1000px',
      'left: -1000px',
      'z-index: 9999',
      'pointer-events: none',
      'display: inline-flex',
      'align-items: center',
      'justify-content: center',
      `background: ${yellow}`,
      'color: #1a1a1a',
      'border-radius: 12px',
      'font-size: 13px',
      'font-weight: 700',
      'min-width: 22px',
      'height: 22px',
      'padding: 0 6px',
      'box-sizing: border-box',
      'box-shadow: 0 2px 8px rgba(0,0,0,0.5)',
      'font-family: inherit',
      'user-select: none',
    ].join(';');
    el.textContent = count;
    return el;
  }

  let dragGhostEl = null;
  let _dragActive  = false;

  function handleDragMove(e) {
    if (!dragGhostEl) return;
    dragGhostEl.style.left    = `${e.clientX + 32}px`;
    dragGhostEl.style.top     = `${e.clientY - 36}px`;
    dragGhostEl.style.display = 'inline-flex';
  }

  function handleDragLeaveWindow(e) {
    if (dragGhostEl && !e.relatedTarget) dragGhostEl.style.display = 'none';
  }

  function cleanupDrag() {
    _dragActive = false;
    document.removeEventListener('dragover',  handleDragMove,        true);
    document.removeEventListener('dragleave', handleDragLeaveWindow);
    document.removeEventListener('mouseup',   cleanupDrag,           true);
    window.removeEventListener('pointerup',   cleanupDrag);
    dragGhostEl?.remove();
    dragGhostEl = null;
    dragStore.end();
  }

  function handleDragStart(e, track) {
    // Always prevent HTML5 drag — we use native startDrag instead
    e.preventDefault();

    // Re-entrancy guard: browser re-fires dragstart on every mousemove when
    // the previous dragstart was preventDefault-ed; only start once per gesture
    if (_dragActive) return;
    _dragActive = true;

    const ids = selectedTrackIds.has(track.trackId)
      ? [...selectedTrackIds]
      : [track.trackId];

    dragStore.start(ids, selectedPlaylistId ?? null);

    // Native file drag
    const fileLocations = ids
      .map(id => library?.tracks[String(id)]?.location)
      .filter(Boolean);
    if (fileLocations.length) window.electronAPI.startFileDrag(fileLocations);

    // Badge ghost for in-app visual feedback
    // (macOS shows its own native file-count badge, so this is redundant there;
    //  kept here for potential use on other platforms)
    // dragGhostEl = createDragGhost(ids.length);
    // dragGhostEl.style.left = `${e.clientX + 14}px`;
    // dragGhostEl.style.top  = `${e.clientY + 14}px`;
    // document.body.appendChild(dragGhostEl);
    // document.addEventListener('dragover',  handleDragMove, true);
    // document.addEventListener('dragleave', handleDragLeaveWindow);

    // Cleanup listeners — always needed to reset _dragActive after drag ends
    document.addEventListener('mouseup',  cleanupDrag, true);
    window.addEventListener('pointerup',  cleanupDrag);
  }

  function handleDragEnd() {
    cleanupDrag();
  }

  function handleTrackContextMenu(e, track) {
    if (!selectedPlaylistId) return;
    e.preventDefault();

    const ids = selectedTrackIds.has(track.trackId)
      ? [...selectedTrackIds]
      : [track.trackId];

    const idsSet = new Set(ids.map(String));

    contextMenu.show(e.clientX, e.clientY, [
      {
        icon: 'trash',
        text: 'Delete from playlist',
        callback: () => {
          removeTracksFromPlaylist(selectedPlaylistId, ids);
          selectedTrackIds = new Set([...selectedTrackIds].filter(id => !idsSet.has(String(id))));
          if (anchorTrackId && idsSet.has(String(anchorTrackId))) anchorTrackId = null;
        },
      },
    ]);
  }

  function formatTime(ms) {

    if (!ms) return '—';

    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
</script>

{#if breadcrumbs && library}
  <div class="playlist-view" style="--num-col-width: {numColWidth}">

    <div class="playlist-header">

      <h1 class="playlist-title">...</h1>
      <h1 class="playlist-title delimiter">{delimiter}</h1>

      {#each breadcrumbs as breadcrumb, index}
        <h1 class="playlist-title">{breadcrumb}</h1>
        {#if index < breadcrumbs.length - 1}
          <h1 class="playlist-title delimiter">{delimiter}</h1>
        {/if}
      {/each}

    </div>

    <div class="track-scroll">

      <div class="track-row header-row">
        <div class="col col-num">#</div>
        <div class="col col-tag">Tag</div>
        <div class="col col-bpm">BPM</div>
        <div class="col col-title">Title</div>
        <div class="col col-time">Time</div>
        <div class="col col-artist">Artist</div>
        <div class="col col-comments">Comments</div>
      </div>

      {#each tracks as track, i (track.trackId)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="track-row data-row"
          class:selected={selectedTrackIds.has(track.trackId)}
          draggable="true"
          onclick={(e) => handleRowClick(e, track.trackId)}
          oncontextmenu={(e) => handleTrackContextMenu(e, track)}
          ondragstart={(e) => handleDragStart(e, track)}
          ondragend={handleDragEnd}
        >
          <div class="col col-num">{i + 1}</div>
          <div class="col col-tag">
            <ColorTag
              color={colorTags.get(String(track.trackId))}
              onclick={() => handleTagLeftClick(track.trackId)}
              onrightclick={() => handleTagRightClick(track.trackId)}
            />
          </div>
          <div class="col col-bpm">{track.bpm ?? '—'}</div>
          <div class="col col-title">{track.name ?? '—'}</div>
          <div class="col col-time">{formatTime(track.totalTime)}</div>
          <div class="col col-artist">{track.artist ?? '—'}</div>
          <div
            class="col col-comments"
            onmouseenter={e => handleCommentEnter(e, track.comments)}
            onmouseleave={handleCommentLeave}
          >{track.comments ?? ''}</div>
        </div>
      {/each}

    </div>

  </div>

  {#if tooltipComment}
    <div class="comment-tooltip" style="top: {tooltipTop}px;">
      {tooltipComment}
    </div>
  {/if}

{/if}

<style>
  .playlist-view {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .playlist-header {
    flex-shrink: 0;
    padding: 1em 2em 0.875em;
    border-bottom: 1px solid var(--border2);

    display: flex;
    gap: 0.75em;
  }

  .playlist-title {

    margin: 0;
    font-size: 1.25em;
    font-weight: 500;
    color: var(--fg2);
  }

  .playlist-title.delimiter {
    color: var(--yellow-warm-80);
  }

  .track-scroll {
    flex: 1;
    overflow: auto;

    padding: 0 1em 0 1em;
    box-sizing: border-box;
  }

  .track-row {
    display: flex;
    align-items: center;
    gap: 1em;
    height: 3em;
    min-width: max-content;

    margin-bottom: 0.25em;
  }

  .track-row:last-of-type {
    margin-bottom: 1em;
  }

  .header-row {
    position: sticky;
    top: 0;
    z-index: 1;
    background: transparent;
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg1);

    padding: 1.5em 0;
    box-sizing: border-box;

    gap: 1.333em;

    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border2);
  }

  .data-row {
    cursor: pointer;
    color: var(--fg3);
    font-size: 1em;
    transition: background-color var(--td-100);

    border-radius: var(--brad2);
  }

  .data-row:nth-child(2n+2) {
    background-color: var(--overlay0);
  }

  .data-row:hover {
    background-color: var(--overlay1);
  }

  .data-row.selected {
    background-color: var(--overlay2);
  }

  .col {
    flex-shrink: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-num {
    width: var(--num-col-width, 2rem);
    text-align: right;
    color: var(--fg1);
  }

  .header-row .col-num {
    width: var(calc(--num-col-width * 4 / 3), 2rem);
  }

  

  .col-tag {
    width: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .col-bpm {
    width: 2rem;
    text-align: right;
    color: var(--fg1);
  }

  .col-title {
    width: 16rem;
  }

  .header-row .col-title {
    width: 15.1rem;
  }

  .col-time {
    width: 4rem;
    text-align: right;
    color: var(--fg1);
  }

  .header-row .col-time {
    width: 4.833rem;
  }

  .col-artist {
    width: 16rem;
  }

  .col-comments {
    width: 25rem;
    color: var(--fg1);
  }

  .comment-tooltip {
    position: fixed;
    right: 1em;
    top: 0;
    transform: translateY(calc(-100% - 0.5em));
    z-index: 200;
    max-width: 30em;
    padding: 0.5em 0.75em;
    background-color: var(--bg2);
    border: 1px solid var(--border3);
    border-radius: var(--brad2);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    font-size: 0.875em;
    color: var(--fg3);
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    pointer-events: none;
  }

</style>
