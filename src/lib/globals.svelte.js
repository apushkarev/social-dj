let globalStorage = $state({

  library: null,
  selectedPlaylistId: null,

  // { name: string, trackIds: string[] } when a folder is alt-clicked, null otherwise
  selectedFolderView: null,

  altPressed: false
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
