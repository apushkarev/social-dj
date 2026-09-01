// Returns a copy of the hierarchy containing only the playlists that hold
// trackId, plus the folders needed to reach them. Folders are shallow-copied so
// the real library tree is never mutated; playlist nodes are reused as-is since
// the subtree renders them read-only.
export function filterHierarchyByTrack(nodes, trackId) {

  const target = String(trackId);
  const out = [];

  for (const node of nodes ?? []) {

    if (node.type === 'playlist') {

      if ((node.trackIds ?? []).some(id => String(id) === target)) out.push(node);

    } else if (node.children?.length) {

      const children = filterHierarchyByTrack(node.children, trackId);

      if (children.length) out.push({ ...node, children });
    }
  }

  return out;
}
