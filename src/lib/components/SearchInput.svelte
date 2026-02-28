<script>
  import { globals } from '../globals.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { searchTracks } from '../search.svelte.js';
  import { icons } from '../icons.js';

  const SEARCH_ID = '__search__';

  let library = $derived(globals.get('library'));

  let isSelected = $derived(globals.get('selectedFolderView')?.id === SEARCH_ID);
  let isCurrentPlaying = $derived(globals.get('playingPlaylistId') === SEARCH_ID);

  let searchQuery = $state('');
  let inputEl = $state(null);

  let _searchTimer = null;

  function runSearch() {

    if (!library?.tracks || searchQuery.length < 2) {
      globals.set('searchResultIds', []);
      return;
    }

    globals.set('searchResultIds', searchTracks(searchQuery, library.tracks));
  }

  function handleInput() {

    globals.set('searchQuery', searchQuery);

    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(runSearch, 200);
  }

  function selectSearchView() {

    globals.set('selectedPlaylistId', null);
    globals.set('selectedFolderView', { id: SEARCH_ID, name: 'Search results' });
    saveAppState();
  }

  function handleClick() {
    selectSearchView();
  }

  $effect(() => {

    function handleKeydown(e) {

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const trigger = isMac ? e.metaKey : e.ctrlKey;

      if (trigger && e.key === 'f') {
        e.preventDefault();
        selectSearchView();
        inputEl?.focus();
      }
    }

    document.addEventListener('keydown', handleKeydown);

    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="search-bar"
  class:selected={isSelected}
  class:current-playing={isCurrentPlaying}
  onclick={handleClick}
>
  <div class="input-group" class:active={isCurrentPlaying}>
    <span class="search-icon">{@html icons.search}</span>

    <input
      bind:this={inputEl}
      bind:value={searchQuery}
      oninput={handleInput}
      placeholder="Search…"
      type="text"
      spellcheck="false"
      autocomplete="off"
    />

  </div>
</div>

<style>
  .search-bar {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 12px;
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color var(--td-100);
  }

  .search-bar:hover {
    background-color: var(--overlay3);
  }

  .search-bar.selected {
    background-color: var(--overlay5);
  }

  .search-bar.current-playing {
    background-color: var(--yellow-warm-80);
  }

  .search-bar.selected:hover {
    background-color: var(--overlay6);
  }

  .search-bar.current-playing:hover {
    background-color: var(--yellow-cool-80);
  }

  .input-group {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.5em;
    height: 2em;
    padding: 0 0.75em 0 0.25em;
    background-color: var(--overlay1);
    border: 1px solid var(--border2);
    border-radius: var(--brad1);
    box-sizing: border-box;
    transition: border-color var(--td-100);
  }

  .input-group:focus-within {
    border-color: var(--border3);
  }

  .input-group.active {
    background-color: var(--yellow-warm-80);
    border-color: var(--black3);
    color: var(--black4);
  }

  .input-group.active input {
    color: var(--black4);
    font-weight: 500;
  }

  .input-group.active input::placeholder {
    color: var(--black2);
  }

  .input-group.active .search-icon {
    color: var(--black3);
  }

  .input-group.active:focus-within {
    border-color: transparent;
  }

  .search-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: var(--fg2-s);
  }

  .current-playing .search-icon {
    color: var(--black4);
  }

  .search-icon :global(svg) {
    width: 24px;
    height: 24px;
  }

  input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: var(--fg4);
    font-family: inherit;
    font-size: 1em;
    caret-color: var(--fg3);
  }

  input::placeholder {
    color: var(--fg1);
  }

</style>
