import { globals } from './globals.svelte.js';

export function generateTagId() {
  return 'T' + (Date.now().toString(16) + Math.random().toString(16).slice(2, 8)).toUpperCase();
}

export function rebuildTagIndex(hierarchy) {
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

// Call once after initAppState() to hydrate tagsIndex from persisted tagsHierarchy.
export function initTagIndex() {
  const hierarchy = globals.get('tagsHierarchy') ?? [];
  globals.set('tagsIndex', rebuildTagIndex(hierarchy));
}

function _syncIndex() {
  const hierarchy = globals.get('tagsHierarchy') ?? [];
  globals.set('tagsIndex', rebuildTagIndex(hierarchy));
}

// Saves the current tagsHierarchy to tags-hierarchy.json.
// The main process annotates each tag node with trackCount and returns
// the annotated hierarchy, which we store back into globals.
async function saveTagsHierarchy() {
  const hierarchy = $state.snapshot(globals.get('tagsHierarchy') ?? []);
  const result = await window.electronAPI?.saveTagsHierarchy(hierarchy);

  if (result?.success && Array.isArray(result.tagsHierarchy)) {
    globals.set('tagsHierarchy', result.tagsHierarchy);
    globals.set('tagsIndex', rebuildTagIndex(result.tagsHierarchy));
  }
}

// Creates a tag or tag-group. parentGroupId=null → root level.
// Returns { newId, newHierarchy, newIndex } or null if parent not found.
export function createTagItem(parentGroupId, type, name) {
  const newId = generateTagId();
  const newItem = type === 'tag-group'
    ? { id: newId, type: 'tag-group', name, children: [] }
    : { id: newId, type: 'tag', name };

  if (parentGroupId === null) {

    globals.update('tagsHierarchy', current => {
      current.push(newItem);
      current.sort((a, b) => a.name.localeCompare(b.name));
      return current;
    });

  } else {

    const index = globals.get('tagsIndex') ?? {};
    const parentPath = index[parentGroupId];
    if (!parentPath) return null;

    globals.update('tagsHierarchy', current => {
      let parent = { children: current };
      for (const i of parentPath) parent = parent.children[i];
      parent.children.push(newItem);
      parent.children.sort((a, b) => a.name.localeCompare(b.name));
      return current;
    });
  }

  _syncIndex();
  saveTagsHierarchy();

  const newHierarchy = globals.get('tagsHierarchy');
  const newIndex = globals.get('tagsIndex');
  return { newId, newHierarchy, newIndex };
}

export function deleteTagItem(tagId) {
  const index = globals.get('tagsIndex') ?? {};
  const path = index[tagId];
  if (!path) return;

  globals.update('tagsHierarchy', current => {
    let parent = { children: current };
    for (let i = 0; i < path.length - 1; i++) {
      parent = parent.children[path[i]];
    }
    parent.children.splice(path[path.length - 1], 1);
    return current;
  });

  _syncIndex();
  saveTagsHierarchy();
}

export function renameTagItem(tagId, newName) {
  const index = globals.get('tagsIndex') ?? {};
  const path = index[tagId];
  if (!path) return;

  globals.update('tagsHierarchy', current => {
    let node = { children: current };
    for (const i of path) node = node.children[i];
    node.name = newName;
    return current;
  });

  saveTagsHierarchy();
}
