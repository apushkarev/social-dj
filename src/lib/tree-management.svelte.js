import { globals } from './globals.svelte.js';

export function generateId() {
  return (Date.now().toString(16) + Math.random().toString(16).slice(2, 8)).toUpperCase();
}

export function rebuildIndex(hierarchy) {
  const index = {};

  function walk(nodes, path) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodePath = [...path, i];
      index[node.id] = nodePath;
      if (node.children) walk(node.children, nodePath);
    }
  }

  walk(hierarchy, []);
  return index;
}

// Takes plain (snapshotted) { hierarchy, index }, adds a new item under parentFolderId.
// Returns { newId, newHierarchy, newIndex } or null if parent not found.
export function addTreeItem({ hierarchy, index }, parentFolderId, type, name) {
  const parentPath = index[parentFolderId];
  if (!parentPath) return null;

  const newId = generateId();

  const newItem = type === 'folder'
    ? { id: newId, type: 'folder', name, parentId: parentFolderId, children: [] }
    : { id: newId, type: 'playlist', name, parentId: parentFolderId, trackIds: [] };

  console.time('[lib] add item to hierarchy');
  const newHierarchy = structuredClone(hierarchy);

  let parentNode = { children: newHierarchy };
  for (const i of parentPath) {
    parentNode = parentNode.children[i];
  }
  parentNode.children.push(newItem);
  console.timeEnd('[lib] add item to hierarchy');

  console.time('[lib] rebuild index');
  const newIndex = rebuildIndex(newHierarchy);
  console.timeEnd('[lib] rebuild index');

  return { newId, newHierarchy, newIndex };
}

// Updates globals.library and persists library.json.
// Returns { newId, newHierarchy, newIndex } or null if parent not found.
export async function createTreeItem(parentFolderId, type, name) {
  const library = globals.get('library');

  const result = addTreeItem(
    {
      hierarchy: $state.snapshot(library.hierarchy),
      index: $state.snapshot(library.index),
    },
    parentFolderId,
    type,
    name,
  );
  if (!result) return null;

  const { newId, newHierarchy, newIndex } = result;

  globals.set('library', {
    tracks: library.tracks,
    hierarchy: newHierarchy,
    index: newIndex,
  });

  console.time('[lib] save library.json');
  await window.electronAPI.saveLibrary({
    tracks: $state.snapshot(library.tracks),
    hierarchy: newHierarchy,
    index: newIndex,
  });
  console.timeEnd('[lib] save library.json');

  return { newId, newHierarchy, newIndex };
}
