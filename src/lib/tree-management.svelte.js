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

function saveHierarchy() {
  const lib = globals.get('library');
  window.electronAPI.saveHierarchy({
    hierarchy: $state.snapshot(lib.hierarchy),
    index: $state.snapshot(lib.index),
  });
}

// Removes the node with nodeId from the hierarchy, rebuilds index, persists.
export function deleteTreeItem(nodeId) {
  const library = globals.get('library');
  const path = library.index[nodeId];
  if (!path) return;

  globals.update('library', current => {
    let parent = { children: current.hierarchy };
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent.children[path[i]];
    }
    parent.children.splice(path[path.length - 1], 1);
    current.index = rebuildIndex(current.hierarchy);
    return current;
  });

  saveHierarchy();
}

// Renames the node with nodeId. Index paths are unaffected by name changes.
export function renameTreeItem(nodeId, newName) {
  const library = globals.get('library');
  const path = library.index[nodeId];
  if (!path) return;

  globals.update('library', current => {
    let node = { children: current.hierarchy };
    for (const i of path) {
      node = node.children[i];
    }
    node.name = newName;
    return current;
  });

  // Keep selectedFolderView name in sync
  const folderView = globals.get('selectedFolderView');
  if (folderView?.id === nodeId) {
    globals.set('selectedFolderView', { ...folderView, name: newName });
  }

  saveHierarchy();
}

// Removes trackIds from a playlist node. Persists hierarchy.json.
export function removeTracksFromPlaylist(playlistId, trackIds) {
  const library = globals.get('library');
  const path = library.index[playlistId];
  if (!path) return;

  globals.update('library', current => {
    let node = { children: current.hierarchy };
    for (const i of path) {
      node = node.children[i];
    }
    if (node.type !== 'playlist') return current;

    const toRemove = new Set(trackIds.map(String));
    node.trackIds = node.trackIds.filter(id => !toRemove.has(String(id)));
    return current;
  });

  saveHierarchy();
}

// Appends unique trackIds to a playlist node. Persists hierarchy.json.
export function addTracksToPlaylist(playlistId, trackIds) {
  const library = globals.get('library');
  const path = library.index[playlistId];
  if (!path) return;

  globals.update('library', current => {
    let node = { children: current.hierarchy };
    for (const i of path) {
      node = node.children[i];
    }
    if (node.type !== 'playlist') return current;

    const existing = new Set(node.trackIds.map(String));
    const toAdd = trackIds.filter(id => !existing.has(String(id)));
    if (toAdd.length) node.trackIds.push(...toAdd);
    return current;
  });

  saveHierarchy();
}

// Moves nodeId to root level of the hierarchy.
export function moveTreeNodeToRoot(nodeId) {
  const library = globals.get('library');
  const nodePath = library.index[nodeId];
  if (!nodePath || nodePath.length === 1) return; // already at root

  globals.update('library', current => {
    let sourceParent = { children: current.hierarchy };
    for (let i = 0; i < nodePath.length - 1; i++) {
      sourceParent = sourceParent.children[nodePath[i]];
    }
    const [movedNode] = sourceParent.children.splice(nodePath[nodePath.length - 1], 1);
    movedNode.parentId = null;
    current.hierarchy.push(movedNode);
    current.hierarchy.sort((a, b) => a.name.localeCompare(b.name));
    current.index = rebuildIndex(current.hierarchy);
    return current;
  });

  saveHierarchy();
}

// Moves nodeId into targetFolderId. Blocks self-drop and circular moves.
export function moveTreeNode(nodeId, targetFolderId) {
  if (nodeId === targetFolderId) return;

  const library = globals.get('library');
  const nodePath = library.index[nodeId];
  const targetPath = library.index[targetFolderId];
  if (!nodePath || !targetPath) return;

  // Block if target is a descendant of the node being moved
  if (
    targetPath.length >= nodePath.length &&
    nodePath.every((v, i) => targetPath[i] === v)
  ) return;

  globals.update('library', current => {
    // Navigate to source parent and target folder using live refs (before any mutation)
    let sourceParent = { children: current.hierarchy };
    for (let i = 0; i < nodePath.length - 1; i++) {
      sourceParent = sourceParent.children[nodePath[i]];
    }

    let targetFolder = { children: current.hierarchy };
    for (const i of targetPath) {
      targetFolder = targetFolder.children[i];
    }

    // Splice node out, update its parentId, push into target
    const [movedNode] = sourceParent.children.splice(nodePath[nodePath.length - 1], 1);
    movedNode.parentId = targetFolderId;
    targetFolder.children.push(movedNode);
    targetFolder.children.sort((a, b) => a.name.localeCompare(b.name));

    current.index = rebuildIndex(current.hierarchy);
    return current;
  });

  saveHierarchy();
}

// Adds a new item under parentFolderId, updates globals, persists.
// Returns { newId, newHierarchy, newIndex } or null if parent not found.
export function createTreeItem(parentFolderId, type, name) {
  const library = globals.get('library');
  const parentPath = library.index[parentFolderId];
  if (!parentPath) return null;

  const newId = generateId();
  const newItem = type === 'folder'
    ? { id: newId, type: 'folder', name, parentId: parentFolderId, children: [] }
    : { id: newId, type: 'playlist', name, parentId: parentFolderId, trackIds: [] };

  globals.update('library', current => {
    let parentNode = { children: current.hierarchy };
    for (const i of parentPath) {
      parentNode = parentNode.children[i];
    }
    parentNode.children.push(newItem);
    parentNode.children.sort((a, b) => a.name.localeCompare(b.name));
    current.index = rebuildIndex(current.hierarchy);
    return current;
  });

  saveHierarchy();

  const lib = globals.get('library');
  return { newId, newHierarchy: lib.hierarchy, newIndex: lib.index };
}
