<script>
  import { globals } from '../globals.svelte.js';
  import { colorTags } from '../color-tags.svelte.js';
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

  // Shows last 3 nodes; prefixes with '... / ' when path is deeper.
  function formatBreadcrumb(names) {

    const branchSteps = 4;

    if (!names || names.length === 0) return null;
    if (names.length <= branchSteps) return names.join(' / ');
    return '... / ' + names.slice(-branchSteps).join(' / ');
  }

  function calcDisplayName() {
    if (selectedFolderView) {
      const names = getBreadcrumbPath(library, selectedFolderView.id);
      if (names) return formatBreadcrumb(names);
      return selectedFolderView.name;
    }
    if (playlist?.type === 'playlist') {
      const names = getBreadcrumbPath(library, selectedPlaylistId);
      if (names) return formatBreadcrumb(names);
      return playlist.name;
    }
    return null;
  }

  let playlist = $derived(getNodeById(library, selectedPlaylistId));

  // Effective view: folder aggregation takes priority over single playlist
  let displayName = $derived(calcDisplayName());

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

  function formatTime(ms) {

    if (!ms) return '—';

    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
</script>

{#if displayName && library}
  <div class="playlist-view" style="--num-col-width: {numColWidth}">

    <div class="playlist-header">
      <h1 class="playlist-title">{displayName}</h1>
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
        <div
          class="track-row data-row"
          class:selected={selectedTrackIds.has(track.trackId)}
          onclick={(e) => handleRowClick(e, track.trackId)}
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
          <div class="col col-comments">{track.comments ?? ''}</div>
        </div>
      {/each}

    </div>

  </div>

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
  }

  .playlist-title {
    margin: 0;
    font-size: 1.5em;
    font-weight: 600;
    color: var(--fg2);
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
  }

  .col-bpm {
    width: 3rem;
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

</style>
