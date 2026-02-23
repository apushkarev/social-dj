import { globals } from './globals.svelte.js';
import { t, tLog } from './helpers.svelte.js';

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

  let _t = t();
  const newHierarchy = structuredClone(hierarchy);
  let parentNode = { children: newHierarchy };
  for (const i of parentPath) {
    parentNode = parentNode.children[i];
  }
  parentNode.children.push(newItem);
  tLog('[lib] add item to hierarchy', _t);

  _t = t();
  const newIndex = rebuildIndex(newHierarchy);
  tLog('[lib] rebuild index', _t);

  return { newId, newHierarchy, newIndex };
}

// Removes the node with nodeId from the hierarchy, rebuilds index, persists.
export async function deleteTreeItem(nodeId) {
  const library = globals.get('library');
  const path = $state.snapshot(library.index)[nodeId];
  if (!path) return;

  let _t = t();
  const newHierarchy = structuredClone($state.snapshot(library.hierarchy));
  let parent = { children: newHierarchy };
  for (let i = 0; i < path.length - 1; i++) {
    parent = parent.children[path[i]];
  }
  parent.children.splice(path[path.length - 1], 1);
  tLog('[lib] delete item from hierarchy', _t);

  _t = t();
  const newIndex = rebuildIndex(newHierarchy);
  tLog('[lib] rebuild index after delete', _t);

  globals.set('library', {
    tracks: library.tracks,
    hierarchy: newHierarchy,
    index: newIndex,
  });

  _t = t();
  await window.electronAPI.saveLibrary({
    tracks: $state.snapshot(library.tracks),
    hierarchy: newHierarchy,
    index: newIndex,
  });
  tLog('[lib] save library.json after delete', _t);
}

// Renames the node with nodeId. Index paths are unaffected by name changes.
export async function renameTreeItem(nodeId, newName) {
  const library = globals.get('library');
  const path = $state.snapshot(library.index)[nodeId];
  if (!path) return;

  let _t = t();
  const newHierarchy = structuredClone($state.snapshot(library.hierarchy));
  let node = { children: newHierarchy };
  for (const i of path) {
    node = node.children[i];
  }
  node.name = newName;
  tLog('[lib] rename item in hierarchy', _t);

  const indexSnapshot = $state.snapshot(library.index);

  globals.set('library', {
    tracks: library.tracks,
    hierarchy: newHierarchy,
    index: indexSnapshot,
  });

  // Keep selectedFolderView name in sync
  const folderView = globals.get('selectedFolderView');
  if (folderView?.id === nodeId) {
    globals.set('selectedFolderView', { ...folderView, name: newName });
  }

  _t = t();
  await window.electronAPI.saveLibrary({
    tracks: $state.snapshot(library.tracks),
    hierarchy: newHierarchy,
    index: indexSnapshot,
  });
  tLog('[lib] save library.json after rename', _t);
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

  const _t = t();
  await window.electronAPI.saveLibrary({
    tracks: $state.snapshot(library.tracks),
    hierarchy: newHierarchy,
    index: newIndex,
  });
  tLog('[lib] save library.json', _t);

  return { newId, newHierarchy, newIndex };
}
