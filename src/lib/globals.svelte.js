let globalStorage = $state({

  // Runtime — not persisted
  library: null,
  selectedPlaylistId: null,

  // { name: string, trackIds: string[] } when a folder is alt-clicked, null otherwise
  selectedFolderView: null,

  audio: {
    header: null // apple music default mode, single output or pre-audition
  },

  currentlyPlayingTrackId: null,
  currentViewTracks: [],

  // Persisted — populated from app-state.json on init, saved on every change
  'volume': {
    "header": 0.5
  },

  'sidebar-selected-item': null,
  'prev-sidebar-selected-item': null,
  
  'tree-scroll-pos': null,
  'tree-width': null,
  'discreteScrolling': false,
  'color-tags': {},
  'tree-open-folders': [],
  'fontSize': 16,
});

function getGlobals() {
  function update(item, handler) {
    globalStorage[item] = handler(globalStorage[item]);
  }

  return {
    get(item) {
      return globalStorage[item];
    },

    set(item, value) {
      globalStorage[item] = value;
    },
    update
  };
}

export const globals = getGlobals();
