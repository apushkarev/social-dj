<script>
  import { globals } from '../globals.svelte.js';
  import { colorTags } from '../color-tags.svelte.js';
  import { dragStore } from '../drag-state.svelte.js';
  import { removeTracksFromPlaylist, setNodeSort, reorderTracksInPlaylist, addTracksToPlaylist, deleteTracksFromLibrary } from '../tree-management.svelte.js';
  import { contextMenu } from '../context-menu.svelte.js';
  import { toMediaUrl } from '../helpers.svelte.js';
  import { getSortedTracks, nextSortDirection, TAG_CYCLE } from '../sort.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { icons } from '../icons.js';
  import ColorTag from './ColorTag.svelte';
  import { slide } from 'svelte/transition';

  let library            = $derived(globals.get('library'));
  let selectedPlaylistId = $derived(globals.get('selectedPlaylistId'));
  let selectedFolderView = $derived(globals.get('selectedFolderView'));

  let selectedTrackIds = $state(new Set());
  let anchorTrackId = $state(null);

  let playingTrackId = $derived(globals.get('currentlyPlayingTrackId'));

  let clickTimer = null;

  // Reorder drag state
  let reorderActive = $state(false);
  let reorderingTrackIds = $state(new Set());
  let liveOrderIds = $state(null);   // null = not dragging; array = live-reordered track IDs
  let trackScrollEl = $state(null);

  let _dragIds = [];
  let _originalTrackIds = [];        // snapshot of sortedTracks order at drag start
  let _pollInterval = null;
  let _pollActive = false;

  $effect(() => {
    selectedPlaylistId;
    selectedFolderView;
    if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; }
    selectedTrackIds = new Set();
    anchorTrackId = null;
  });

  // Keep queue in sync with current view — uses sorted order for prev/next navigation
  $effect(() => {
    globals.set('currentViewTracks', sortedTracks);
  });

  function nextColor(trackId) {

    const idx = TAG_CYCLE.indexOf(colorTags.get(String(trackId)));

    return TAG_CYCLE[(idx + 1) % TAG_CYCLE.length];
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

  function handleRowDblClick(trackId) {

    const track = library?.tracks[String(trackId)];
    if (!track?.location) return;

    // Delegate to HeaderPlayer's loadTrack via the registered action on the audio globals.
    // This ensures duration/currentTime/playbarProgress are reset correctly.
    const headerAudio = globals.get('audio')?.header;
    if (!headerAudio) return;

    // Snapshot the current view as the active playing queue.
    globals.set('currentPlayingTracks', sortedTracks);
    globals.set('playingPlaylistId', activeNodeId);

    globals.set('currentlyPlayingTrackId', trackId);

    headerAudio.src = toMediaUrl(track.location);
    headerAudio.load();
    headerAudio.play().catch(() => {});
  }

  function handleRowClick(e, trackId) {

    // Modifier-key clicks are immediate (multi-select, no dblclick conflict)
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      doSelectionLogic(e, trackId);
      return;
    }

    // Debounce plain clicks to let dblclick fire first
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      return;
    }

    clickTimer = setTimeout(() => {
      clickTimer = null;
      doSelectionLogic(e, trackId);
    }, 200);
  }

  function doSelectionLogic(e, trackId) {

    if (e.shiftKey && anchorTrackId) {

      e.preventDefault();

      const anchorIdx = sortedTracks.findIndex(t => t.trackId === anchorTrackId);
      const clickIdx  = sortedTracks.findIndex(t => t.trackId === trackId);

      if (anchorIdx !== -1 && clickIdx !== -1) {

        const lo = Math.min(anchorIdx, clickIdx);
        const hi = Math.max(anchorIdx, clickIdx);

        selectedTrackIds = new Set(sortedTracks.slice(lo, hi + 1).map(t => t.trackId));
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

      if (selectedTrackIds.size === sortedTracks.length) {
        selectedTrackIds = new Set();
      } else {
        selectedTrackIds = new Set(sortedTracks.map(t => t.trackId));
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

  const LIBRARY_ID = '__library__';
  const SEARCH_ID = '__search__';

  let activeNodeId = $derived(selectedFolderView?.id ?? selectedPlaylistId);

  let sortColumn = $derived(
    activeNodeId === LIBRARY_ID
      ? (globals.get('librarySortColumn') ?? null)
      : activeNodeId === SEARCH_ID
        ? (globals.get('searchSortColumn') ?? null)
        : (getNodeById(library, activeNodeId)?.sortColumn ?? null)
  );

  let sortDirection = $derived(
    activeNodeId === LIBRARY_ID
      ? (globals.get('librarySortDirection') ?? 0)
      : activeNodeId === SEARCH_ID
        ? (globals.get('searchSortDirection') ?? 0)
        : (getNodeById(library, activeNodeId)?.sortDirection ?? 0)
  );

  let sortedTracks = $derived(getSortedTracks(tracks, sortColumn, sortDirection, colorTags));

  // During reorder drag shows live-reordered list; otherwise shows normal sorted list.
  let displayTracks = $derived(
    liveOrderIds
      ? liveOrderIds.map(id => library?.tracks[String(id)]).filter(Boolean)
      : sortedTracks
  );

  // num/ascending IS the original order — don't treat it as a sort that blocks reordering
  let isSorted = $derived(
    sortColumn !== null &&
    sortDirection !== 0 &&
    !(sortColumn === 'num' && sortDirection === 1)
  );
  let isReorderAllowed = $derived(!isSorted && !!selectedPlaylistId && !selectedFolderView);

  // Effective view: folder aggregation takes priority over single playlist
  let breadcrumbs = $derived(calcBreadcrumbs());

  function getSearchCountLabel() {
    if (activeNodeId !== SEARCH_ID) return null;
    const query = globals.get('searchQuery');
    if (!query || query.length < 2) return null;
    const count = globals.get('searchResultIds').length;
    return count > 0 ? `(${count})` : '(nothing found)';
  }

  let searchCountLabel = $derived(getSearchCountLabel());

  let activeTrackIds = $derived(
    activeNodeId === SEARCH_ID
      ? (globals.get('searchResultIds') ?? [])
      : selectedFolderView?.trackIds
        ?? (playlist?.type === 'playlist' ? playlist.trackIds : null)
  );

  // Reset selection when search results change so stale selections don't linger.
  $effect(() => {
    globals.get('searchResultIds');
    if (activeNodeId !== SEARCH_ID) return;
    selectedTrackIds = new Set();
    anchorTrackId = null;
  });

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

  // External file drop (from Finder / OS)
  const AUDIO_EXTS = new Set(['.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg', '.opus', '.aiff', '.aif']);

  let externalDragOver = $state(false);
  let isDropAllowed = $derived(!selectedFolderView && playlist?.type === 'playlist');

  function isExternalFileDrag(e) {
    return isDropAllowed && [...(e.dataTransfer?.types ?? [])].includes('Files');
  }

  function handleExternalDragEnter(e) {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    externalDragOver = true;
  }

  function handleExternalDragOver(e) {
    if (!isExternalFileDrag(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }

  function handleExternalDragLeave(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    externalDragOver = false;
  }

  async function handleExternalDrop(e) {
    e.preventDefault();
    externalDragOver = false;

    if (!isDropAllowed) return;

    const files = [...e.dataTransfer.files].filter(f => {
      const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase();
      return AUDIO_EXTS.has(ext);
    });

    if (!files.length) return;

    const vdjDbPath = globals.get('vdjDatabasePath') ?? null;

    for (const file of files) {

      const filePath = window.electronAPI.getPathForFile(file);

      const result = await window.electronAPI.addTrack(filePath, vdjDbPath);

      if (!result.success) continue;

      const { track } = result;

      globals.update('library', lib => {
        lib.tracks[String(track.trackId)] = track;
        return lib;
      });

      addTracksToPlaylist(selectedPlaylistId, [track.trackId]);
    }
  }

  let _dragActive = false;
  let _fileDragStarted = false;
  let _ghostEl = null;

  function createDragGhost() {

    const cs = getComputedStyle(document.documentElement);
    const bg2     = cs.getPropertyValue('--bg2').trim();
    const border3 = cs.getPropertyValue('--border3').trim();
    const fg3     = cs.getPropertyValue('--fg3').trim();

    const el = document.createElement('div');
    el.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'pointer-events:none', 'z-index:9999',
      'display:flex', 'align-items:center',
      'padding:8px 16px 8px 12px',
      `background:${bg2}`, `border:1px solid ${border3}`,
      'border-radius:8px', `color:${fg3}`,
      'font-family:inherit', 'font-size:13px', 'font-weight:500',
      'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
      'white-space:nowrap', 'will-change:transform',
    ].join(';');

    const count = _dragIds.length;
    const firstName = count === 1 ? (library?.tracks[String(_dragIds[0])]?.name ?? null) : null;
    const label = firstName
      ? (firstName.length > 28 ? firstName.slice(0, 28) + '\u2026' : firstName)
      : `${count} track${count === 1 ? '' : 's'}`;

    el.textContent = label;
    document.body.appendChild(el);

    return el;
  }

  function moveGhost(x, y) {
    if (!_ghostEl) return;
    _ghostEl.style.transform = `translate(${x + 14}px, ${y + 14}px)`;
  }

  function removeGhost() {
    if (_ghostEl) {
      _ghostEl.remove();
      _ghostEl = null;
    }
  }

  function getDropIndexFromY(clientY) {

    const rows = trackScrollEl.querySelectorAll('.data-row');
    let dropIndex = rows.length;

    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();

      if (clientY < rect.top + rect.height / 2) {
        dropIndex = i;
        break;
      }
    }

    return dropIndex;
  }

  function computeReorderedIds(visualIds, movedIds, dropIndex) {

    const movedSet = new Set(movedIds.map(String));

    const insertIndex = visualIds
      .slice(0, dropIndex)
      .filter(id => !movedSet.has(String(id))).length;

    const remaining = visualIds.filter(id => !movedSet.has(String(id)));
    const orderedMoved = visualIds.filter(id => movedSet.has(String(id)));

    return [
      ...remaining.slice(0, insertIndex),
      ...orderedMoved,
      ...remaining.slice(insertIndex),
    ];
  }

  // Polls getCursorScreenPoint() via IPC every 16ms during native drag.
  // pointermove stops firing once startFileDrag hands off to the OS; this keeps
  // the live order in sync throughout the drag.
  function startCursorPoll() {

    _pollActive = true;

    _pollInterval = setInterval(async () => {

      if (!_pollActive || !trackScrollEl || !reorderActive || !isReorderAllowed) return;

      const pos = await window.electronAPI.getCursorScreenPoint();

      if (!_pollActive || !pos) return;

      const rect = trackScrollEl.getBoundingClientRect();
      const inside = pos.x >= rect.left && pos.x <= rect.right &&
                     pos.y >= rect.top  && pos.y <= rect.bottom;

      if (inside) {
        const dropIdx = getDropIndexFromY(pos.y);
        liveOrderIds = computeReorderedIds(liveOrderIds, _dragIds, dropIdx);
      }
      // When outside: keep last live order (don't revert)

    }, 16);
  }

  function stopCursorPoll() {
    _pollActive = false;
    clearInterval(_pollInterval);
    _pollInterval = null;
  }

  function handleDragStart(e, track) {

    // Suppress the HTML5 drag entirely — native OS icon from startFileDrag is used instead.
    // e.preventDefault() means ondragend never fires, but we use pointerup for end detection.
    e.preventDefault();

    if (_dragActive) return;
    _dragActive = true;

    _dragIds = selectedTrackIds.has(track.trackId)
      ? sortedTracks.filter(t => selectedTrackIds.has(t.trackId)).map(t => t.trackId)
      : [track.trackId];

    reorderingTrackIds = new Set(_dragIds.map(String));
    reorderActive = true;

    _originalTrackIds = sortedTracks.map(t => t.trackId);
    liveOrderIds = [..._originalTrackIds];

    dragStore.start(_dragIds, selectedPlaylistId ?? null);

    startCursorPoll();

    _ghostEl = createDragGhost();
    moveGhost(e.clientX, e.clientY);

    // pointerup fires if the OS forwards the mouseUp to the renderer (not always).
    document.addEventListener('pointerup', handleDragPointerUp, true);
    window.addEventListener('pointerup', handleDragPointerUp);

    // pointermove + e.buttons === 0 is the reliable fallback for LMB release detection.
    document.addEventListener('pointermove', handleDragPointerMove, true);
  }

  // Handles both drag-end detection (buttons=0) and deferred external file drag
  // (cursor left the window while LMB is held).
  // pointermove fires outside window bounds via pointer capture while LMB is pressed.
  function handleDragPointerMove(e) {

    if (!_dragActive) {
      document.removeEventListener('pointermove', handleDragPointerMove, true);
      return;
    }

    if (e.buttons === 0) {
      handleDragPointerUp();
      return;
    }

    const outside = e.clientX < 0 || e.clientX > window.innerWidth ||
                    e.clientY < 0 || e.clientY > window.innerHeight;

    if (outside) {

      dragStore.setHoveredPlaylistNode(null);

      // Cursor has left the window — start native file drag for external drop.
      if (!_fileDragStarted) {
        removeGhost();
        liveOrderIds = [..._originalTrackIds];
        _fileDragStarted = true;
        const fileLocations = _dragIds
          .map(id => library?.tracks[String(id)]?.location)
          .filter(Boolean);
        if (fileLocations.length) window.electronAPI.startFileDrag(fileLocations);
      }

    } else {

      moveGhost(e.clientX, e.clientY);

      // Detect playlist node under cursor for tree drop.
      const els = document.elementsFromPoint(e.clientX, e.clientY);
      const nodeEl = els.find(el => el.dataset?.nodeType === 'playlist' && el.dataset?.nodeId);
      dragStore.setHoveredPlaylistNode(nodeEl?.dataset.nodeId ?? null);
    }
  }

  // Primary drag-end handler. Called via pointerup or pointermove-buttons=0.
  // Saves the current live order (already computed by the poll) and cleans up.
  function handleDragPointerUp() {

    if (!_dragActive) return;

    // Prevent re-entry from multiple listeners firing.
    _dragActive = false;
    _fileDragStarted = false;

    document.removeEventListener('pointerup', handleDragPointerUp, true);
    window.removeEventListener('pointerup', handleDragPointerUp);
    document.removeEventListener('pointermove', handleDragPointerMove, true);

    stopCursorPoll();
    removeGhost();

    // Capture before dragStore.end() clears these.
    const hoveredNodeId = dragStore.hoveredPlaylistNodeId;
    const sourceId = dragStore.sourcePlaylistId;
    const isTreeDrop = !!(hoveredNodeId && hoveredNodeId !== sourceId);

    dragStore.setHoveredPlaylistNode(null);

    // liveOrderIds already reflects the final position from real-time polling.
    // Skip reorder save when dropping onto a different playlist — avoid accidental reorders.
    if (!isTreeDrop && reorderActive && isReorderAllowed && liveOrderIds) {
      reorderTracksInPlaylist(selectedPlaylistId, liveOrderIds);
    }

    // Add dragged tracks to the hovered tree node playlist.
    if (isTreeDrop) {
      addTracksToPlaylist(hoveredNodeId, _dragIds);
    }

    reorderActive = false;
    liveOrderIds = null;
    _originalTrackIds = [];
    reorderingTrackIds = new Set();
    _dragIds = [];

    dragStore.end();
  }

  function handleHeaderClick(col) {

    let newDir = sortColumn === col ? nextSortDirection(sortDirection) : 1;

    if (col === 'num') newDir = 1;

    if (activeNodeId === LIBRARY_ID) {
      globals.set('librarySortColumn', col);
      globals.set('librarySortDirection', newDir);
      saveAppState();
    } else if (activeNodeId === SEARCH_ID) {
      globals.set('searchSortColumn', col);
      globals.set('searchSortDirection', newDir);
    } else {
      setNodeSort(activeNodeId, col, newDir);
    }
  }

  function handleTrackContextMenu(e, track) {

    const row = e.currentTarget;

    if (!selectedPlaylistId && activeNodeId !== SEARCH_ID) return;
    e.preventDefault();

    const ids = selectedTrackIds.has(track.trackId)
      ? [...selectedTrackIds]
      : [track.trackId];

    const idsSet = new Set(ids.map(String));

    const showInFinderLabel = window.electronAPI?.platform === 'darwin' ? 'Show in Finder' : 'Show in Explorer';

    const items = [
      {
        icon: 'folder',
        text: showInFinderLabel,
        callback: () => {
          if (track.location) window.electronAPI?.showInFolder(track.location);
        },
      },
    ];

    if (selectedPlaylistId) {
      items.push(
        { type: 'separator' },
        {
          icon: 'trash',
          text: 'Delete from playlist',
          callback: () => {

            removeTracksFromPlaylist(selectedPlaylistId, ids);
            selectedTrackIds = new Set([...selectedTrackIds].filter(id => !idsSet.has(String(id))));
            if (anchorTrackId && idsSet.has(String(anchorTrackId))) anchorTrackId = null;
          },
        },
      );
    }

    items.push(
      { type: 'separator' },
      {
        icon: 'trash',
        text: 'Delete from library',
        callback: () => {

          deleteTracksFromLibrary(ids);
          selectedTrackIds = new Set([...selectedTrackIds].filter(id => !idsSet.has(String(id))));
          if (anchorTrackId && idsSet.has(String(anchorTrackId))) anchorTrackId = null;
        },
      },
    );

    contextMenu.show(e.clientX, e.clientY, items, row, 'mouse', 'target');
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
  <div class="playlist-view" style="--num-col-width: {numColWidth}" class:drag-sorted={reorderActive && !isReorderAllowed}>

    <div class="playlist-header">

      <h1 class="playlist-title">...</h1>
      <h1 class="playlist-title delimiter">{delimiter}</h1>

      {#each breadcrumbs as breadcrumb, index}
        <h1 class="playlist-title">{breadcrumb}</h1>
        {#if index < breadcrumbs.length - 1}
          <h1 class="playlist-title delimiter">{delimiter}</h1>
        {/if}
      {/each}

      {#if searchCountLabel}
        <h1 class="playlist-title search-count">{searchCountLabel}</h1>
      {/if}

    </div>

    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="track-scroll"
      class:external-drag-over={externalDragOver}
      bind:this={trackScrollEl}
      ondragenter={handleExternalDragEnter}
      ondragover={handleExternalDragOver}
      ondragleave={handleExternalDragLeave}
      ondrop={handleExternalDrop}
    >

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div class="track-row header-row">

        <div class="col col-num jcfe sortable" onclick={() => handleHeaderClick('num')}>
          <span style="font-size: 1.25em;">#</span>
          {#if sortColumn === 'num'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap2"></div>

        <div class="col col-tag jcc sortable" onclick={() => handleHeaderClick('tag')}>
          <span>Tag</span>
          {#if sortColumn === 'tag'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap2"></div>

        <div class="col col-bpm jcfe sortable" onclick={() => handleHeaderClick('bpm')}>
          <span>BPM</span>
          {#if sortColumn === 'bpm'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap1"></div>

        <div class="col col-title jcfs sortable" onclick={() => handleHeaderClick('title')}>
          <span>Title</span>
          {#if sortColumn === 'title'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap2"></div>

        <div class="col col-time jcfe sortable" onclick={() => handleHeaderClick('time')}>
          <span>Time</span>
          {#if sortColumn === 'time'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap1"></div>

        <div class="col col-artist jcfs sortable" onclick={() => handleHeaderClick('artist')}>
          <span>Artist</span>
          {#if sortColumn === 'artist'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>

        <div class="hGap3"></div>

        <div class="col col-comments jcfs sortable" onclick={() => handleHeaderClick('comments')}>
          <span>Comments</span>
          {#if sortColumn === 'comments'}<span class="sort-arrow" class:desc={sortDirection === -1}>{@html icons.arrowDown}</span>{/if}
        </div>
      </div>

      {#each displayTracks as track, i (track.trackId)}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="track-row data-row"
          class:selected={selectedTrackIds.has(track.trackId)}
          class:playing={track.trackId === playingTrackId}
          class:reordering={reorderActive && isReorderAllowed && reorderingTrackIds.has(String(track.trackId))}
          
          draggable="true"
          ondragstart={(e) => handleDragStart(e, track)}

          onclick={(e) => handleRowClick(e, track.trackId)}
          ondblclick={() => handleRowDblClick(track.trackId)}
          oncontextmenu={(e) => handleTrackContextMenu(e, track)}
        >
          <div class="col col-num">{i + 1}</div>

          <div class="col col-tag">
            <ColorTag
              color={colorTags.get(String(track.trackId))}
              onclick={() => handleTagLeftClick(track.trackId)}
              onrightclick={() => handleTagRightClick(track.trackId)}
              playing={track.trackId === playingTrackId}
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

    padding-right: 0.5em;
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

  .playlist-title.search-count {
    color: var(--fg1);
    font-weight: 400;
  }

  .track-scroll {
    flex: 1;
    overflow: auto;

    padding: 0 1em 0 1em;
    box-sizing: border-box;

    border-radius: var(--brad2);
    box-shadow: inset 0 0 0 0 transparent;
    transition: box-shadow var(--td-150);
  }

  .track-scroll.external-drag-over {
    box-shadow: inset 0 0 0 2px var(--meadow-green);
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
    gap: 0;
    padding: 0.5em 0;
    height: 3em;
    box-sizing: border-box;

    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--border2);
  }

  .header-row .col {
    display: flex;
    align-items: center;
    gap: 0.3em;
    padding-top: 0.25em;
    padding-right: 0.25em;
    padding-bottom: 0.25em;
    padding-left: 0.75em;
    box-sizing: border-box;

    height: 2.25em;
  }

  .header-row .sortable {
    cursor: pointer;
    user-select: none;
    border-radius: var(--brad1);
    transition: background-color var(--td-100);
  }

  .header-row .sortable:hover {
    background-color: var(--overlay3);
  }

  .header-row .sortable:active {
    background-color: var(--overlay4);
  }

  .sort-arrow {
    
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transform: rotate(180deg);
    transition: transform var(--td-150);

    width: 20px;
    height: 20px;
  }

  .sort-arrow.desc {
    transform: rotate(0deg);
  }

  .sort-arrow :global(svg) {
    width: 20px;
    height: 20px;
  }

  .data-row {
    cursor: pointer;
    color: var(--fg3);
    font-size: 1em;
    transition: background-color var(--td-100);

    border-radius: var(--brad2);
  }

  .data-row:nth-child(2n+2) {
    background-color: var(--overlay1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.025);
  }

  .data-row:hover {
    background-color: var(--overlay3);
  }

  .data-row.selected {
    background-color: var(--overlay5);
  }

  .data-row.playing {
    background-color: var(--yellow-warm-80);
    color: var(--black4);
  }

  .data-row.playing .col-num,
  .data-row.playing .col-bpm,
  .data-row.playing .col-time,
  .data-row.playing .col-comments,
  .data-row.playing .col-title,
  .data-row.playing .col-artist {
    color: var(--black4);
    font-weight: 500;
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
    width: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .col-bpm {
    width: 3.5rem;
    text-align: right;
    color: var(--fg1);
  }

  .header-row .col-bpm {
    width: 4rem;
  }

  .data-row .col-bpm {
    padding-right: 0.125em;
  }

  .col-title {
    width: 16rem;
  }

  .header-row .col-title {
    width: 21.6em;
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

  .playlist-view.drag-sorted {
    outline: 2px solid var(--meadow-green);
    outline-offset: -2px;
    border-radius: var(--brad2);
  }

  .data-row.reordering {
    background-color: var(--overlay5);
    box-shadow: inset 0 0 0 2px var(--meadow-green);
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
