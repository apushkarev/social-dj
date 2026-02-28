<script>
  import { globals } from '../globals.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { icons } from '../icons.js';
  import AddTreeItem from './AddTreeItem.svelte';

  const LIBRARY_ID = '__library__';

  let library = $derived(globals.get('library'));

  let userName = $derived(globals.get('userName') ?? '');
  let headingText = $derived(userName ? `${userName}'s Library` : 'Library');

  let isSelected = $derived(globals.get('selectedFolderView')?.id === LIBRARY_ID);
  let isCurrentPlaying = $derived(globals.get('playingPlaylistId') === LIBRARY_ID);

  let showModal = $state(false);
  let modalType = $state('playlist');
  let modalX = $state(0);
  let modalY = $state(0);

  function handleAddPlaylist(e) {

    e.stopPropagation();

    modalType = 'playlist';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleAddFolder(e) {

    e.stopPropagation();

    modalType = 'folder';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleClick(e) {

    if (!e.altKey) return;
    if (!library?.tracks) return;

    const trackIds = Object.keys(library.tracks);

    globals.set('selectedPlaylistId', null);
    globals.set('selectedFolderView', {
      id: LIBRARY_ID,
      name: headingText,
      trackIds,
    });

    saveAppState();
  }
</script>

<button
  class="heading-row"
  class:selected={isSelected}
  class:current-playing={isCurrentPlaying}
  data-snap-row
  onclick={handleClick}
>
  <span class="heading-label">{headingText}</span>

  <span class="node-actions" onclick={e => e.stopPropagation()}>
    <span
      class="action-icon"
      title="Add playlist"
      onclick={handleAddPlaylist}
    >{@html icons.addPlaylist}</span>

    <span
      class="action-icon"
      title="Add folder"
      onclick={handleAddFolder}
    >{@html icons.addFolder}</span>
  </span>
</button>

<AddTreeItem
  type={modalType}
  parentFolderId={null}
  parentFolderName={headingText}
  x={modalX}
  y={modalY}
  bind:visible={showModal}
/>

<style>
  .heading-row {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    border: none;
    background: none;
    font-family: inherit;
    cursor: pointer;
    padding: 0.75em 0.75em;
    box-sizing: border-box;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    box-sizing: border-box;
    transition: background-color var(--td-100);
    color: var(--fg2-s);
  }

  .heading-label {
    flex: 1;
    font-size: 1.125em;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .heading-row:hover {
    background-color: var(--overlay3);
  }

  .heading-row.selected {
    background-color: var(--overlay5);
    color: var(--fg3-s);
  }

  .heading-row.current-playing {
    background-color: var(--yellow-warm-80);
    color: var(--black4);
  }

  .heading-row.selected:hover {
    background-color: var(--overlay6);
  }

  .heading-row.current-playing:hover {
    background-color: var(--yellow-cool-80);
    color: var(--black4);
  }

  .node-actions {
    display: flex;
    align-items: center;
    gap: 1em;
    flex-shrink: 0;
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg2-s);
    cursor: pointer;

    transition: color var(--td-100);
  }

  .selected .action-icon {
    color: var(--fg4-s);
  }

  .action-icon:hover {
    color: var(--fg3-s);
  }

  .action-icon:active {
    color: var(--fg5-s);
  }

  .selected .action-icon:hover {
    color: var(--fg6-s);
  }

  .selected .action-icon:active {
    color: var(--fg5-s);
  }

  .current-playing .action-icon {
    color: var(--black3);
  }

  .current-playing .action-icon:hover {
    color: var(--black4);
  }

  .current-playing .action-icon:active {
    color: var(--black6);
  }
</style>
