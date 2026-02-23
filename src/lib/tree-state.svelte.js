import { globals } from './globals.svelte.js';
import { saveAppState } from './app-state.svelte.js';

function _get() {
  return globals.get('tree-open-folders') ?? [];
}

export const treeState = {
  isOpen(id) {
    return _get().includes(id);
  },

  toggle(id) {
    const current = _get();
    const next = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    globals.set('tree-open-folders', next);
    saveAppState();
  },

  reset() {
    globals.set('tree-open-folders', []);
    saveAppState();
  },
};
