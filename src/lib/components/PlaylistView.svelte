<script>
  import { globals } from '../globals.svelte.js';

  let library = $derived(globals.get('library'));
  let selectedPlaylistId = $derived(globals.get('selectedPlaylistId'));

  let selectedTrackId = $state(null);

  $effect(() => {
    selectedPlaylistId;
    selectedTrackId = null;
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

  let playlist = $derived(getNodeById(library, selectedPlaylistId));

  let tracks = $derived(
    playlist?.trackIds
      ?.map(id => library.tracks[String(id)])
      .filter(Boolean) ?? []
  );

  let numColWidth = $derived(
    `${Math.floor(Math.log10(Math.max(tracks.length, 1))) + 1.5}rem`
  );

  function formatTime(ms) {
    if (!ms) return '—';
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  }
</script>

{#if playlist?.type === 'playlist'}
  <div class="playlist-view" style="--num-col-width: {numColWidth}">

    <div class="playlist-header">
      <h1 class="playlist-title">{playlist.name}</h1>
    </div>

    <div class="track-scroll">

      <div class="track-row header-row">
        <div class="col col-num">#</div>
        <!-- <div class="col col-tag"></div> -->
        <div class="col col-title">Title</div>
        <div class="col col-time">Time</div>
        <div class="col col-artist">Artist</div>
        <div class="col col-comments">Comments</div>
      </div>

      {#each tracks as track, i (track.trackId)}
        <div
          class="track-row data-row"
          class:selected={selectedTrackId === track.trackId}
          onclick={() => selectedTrackId = track.trackId}
        >
          <div class="col col-num">{i + 1}</div>
          <!-- <div class="col col-tag"></div> -->
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
    margin-bottom: 1em;
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
    height: 2.5em;

    margin-bottom: 0.25em;
  }

  .track-row:last-of-type {
    margin-bottom: 1em;
  }

  .header-row {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--bg1);
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--fg1);

    padding-bottom: 1em;
    box-sizing: border-box;

    gap: 1.333em;
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
    width: 1.5rem;
  }

  .col-title {
    width: 20rem;
  }

  .header-row .col-title {
    width: 19.2rem;
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
    width: 20rem;
  }

  .col-comments {
    width: 40rem;
    color: var(--fg1);
  }

</style>
