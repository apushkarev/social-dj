const STORAGE_KEY = 'tree-open-folders';

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveToStorage(set) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

let openFolders = $state(loadFromStorage());

export const treeState = {
  isOpen(id) {
    return openFolders.has(id);
  },

  toggle(id) {
    if (openFolders.has(id)) {
      openFolders.delete(id);
    } else {
      openFolders.add(id);
    }
    openFolders = new Set(openFolders);
    saveToStorage(openFolders);
  },

  reset() {
    openFolders = new Set();
    saveToStorage(openFolders);
  },
};
