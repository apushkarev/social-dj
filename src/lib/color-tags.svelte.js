import { globals } from './globals.svelte.js';
import { saveAppState } from './app-state.svelte.js';

export const colorTags = {
  get(trackId) {
    const tags = globals.get('color-tags') ?? {};
    return tags[String(trackId)] ?? null;
  },

  set(trackId, color) {
    const next = { ...(globals.get('color-tags') ?? {}) };
    if (color === null) {
      delete next[String(trackId)];
    } else {
      next[String(trackId)] = color;
    }
    globals.set('color-tags', next);
    saveAppState();
  },
};
