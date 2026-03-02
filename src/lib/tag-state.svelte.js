import { globals } from './globals.svelte.js';
import { saveAppState } from './app-state.svelte.js';

function _get() {
  return globals.get('tag-open-groups') ?? [];
}

export const tagState = {
  isOpen(id) {
    return _get().includes(id);
  },

  toggle(id) {
    const current = _get();
    const next = current.includes(id)
      ? current.filter(f => f !== id)
      : [...current, id];
    globals.set('tag-open-groups', next);
    saveAppState();
  },

  reset() {
    globals.set('tag-open-groups', []);
    saveAppState();
  },
};
