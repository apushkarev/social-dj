import { globals } from './globals.svelte.js';

const PERSISTED_KEYS = [
  'sidebar-selected-item',
  'prev-sidebar-selected-item',
  'tree-scroll-pos',
  'tree-width',
  'discreteScrolling',
  'color-tags',
  'tree-open-folders',
  'selectedPlaylistId',
  'selectedFolderView',
  'fontSize',
  'userName',
  'librarySortColumn',
  'librarySortDirection',
  'volume',
  'vdjDatabasePath',
  'soundOutputs',
];

// Checks saved soundOutputs against currently available devices.
// Resets any device that's no longer present to null (system default).
async function validateSoundOutputs() {
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    const availableIds = new Set(
      all.filter(d => d.kind === 'audiooutput').map(d => d.deviceId)
    );

    const saved = globals.get('soundOutputs') ?? {};
    const validated = { ...saved };
    let changed = false;

    for (const key of Object.keys(validated)) {
      const deviceId = validated[key];

      if (deviceId && !availableIds.has(deviceId)) {
        validated[key] = null;
        changed = true;
      }
    }

    if (changed) globals.set('soundOutputs', validated);
  } catch {}
}

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

  await validateSoundOutputs();
}

// Writes all persisted globals to app-state.json.
export function saveAppState() {
  const state = {};
  for (const key of PERSISTED_KEYS) {
    let value = $state.snapshot(globals.get(key));

    // Search view is session-only — don't persist it.
    if (key === 'selectedFolderView' && value?.id === '__search__') value = null;

    state[key] = value;
  }
  window.electronAPI?.writeAppState(state);
}

window.saveAppState = saveAppState