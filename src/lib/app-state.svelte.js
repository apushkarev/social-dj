import { globals } from './globals.svelte.js';
import { sortRootLevel, rebuildIndex } from './tree-management.svelte.js';

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
  'tag-open-groups',
  'tags-scroll-pos',
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

  // Load tags hierarchy from its own file (separate from app-state.json)
  try {
    const tagsRes = await fetch('/library/tags-hierarchy.json');
    if (tagsRes.ok) {
      const tagsData = await tagsRes.json();
      if (Array.isArray(tagsData?.tagsHierarchy)) globals.set('tagsHierarchy', tagsData.tagsHierarchy);
      if (tagsData?.tagsSortOrder) globals.set('tagsSortOrder', tagsData.tagsSortOrder);
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

window.saveAppState = saveAppState;

// Loads tracks + hierarchy from JSON files and populates globals.library.
// Called once at startup from App.svelte so it runs regardless of which
// sidebar tab is initially selected.
export async function loadLibrary() {
  try {
    const [tracksRes, hierarchyRes] = await Promise.all([
      fetch('/library/tracks.json'),
      fetch('/library/hierarchy.json'),
    ]);

    const { tracks } = await tracksRes.json();
    const { hierarchy } = await hierarchyRes.json();

    sortRootLevel(hierarchy);

    globals.set('library', { tracks, hierarchy, index: rebuildIndex(hierarchy) });
  } catch {}
}
