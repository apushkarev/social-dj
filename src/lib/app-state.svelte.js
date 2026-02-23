import { globals } from './globals.svelte.js';

const PERSISTED_KEYS = [
  'sidebar-selected-item',
  'tree-scroll-pos',
  'tree-width',
  'discreteScrolling',
  'color-tags',
  'tree-open-folders',
  'selectedPlaylistId',
  'selectedFolderView',
];

// Loads persisted state from app-state.json into globals.
// Call once before mounting the app.
export async function initAppState() {
  try {
    const res = await fetch('/app-state.json');
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        for (const key of PERSISTED_KEYS) {
          if (key in data) globals.set(key, data[key]);
        }
      }
    }
  } catch {}
}

// Writes all persisted globals to app-state.json.
export function saveAppState() {
  const state = {};
  for (const key of PERSISTED_KEYS) {
    state[key] = $state.snapshot(globals.get(key));
  }
  window.electronAPI?.writeAppState(state);
}

window.saveAppState = saveAppState