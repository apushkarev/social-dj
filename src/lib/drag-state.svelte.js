let _isDragging = $state(false);
let _trackIds = $state([]);
let _sourcePlaylistId = $state(null);
let _draggingNodeId = $state(null);
let _hoveredPlaylistNodeId = $state(null);

export const dragStore = {
  get isDragging() { return _isDragging; },
  get trackIds() { return _trackIds; },
  get sourcePlaylistId() { return _sourcePlaylistId; },
  get draggingNodeId() { return _draggingNodeId; },
  get hoveredPlaylistNodeId() { return _hoveredPlaylistNodeId; },

  start(trackIds, sourcePlaylistId = null) {
    _isDragging = true;
    _trackIds = trackIds;
    _sourcePlaylistId = sourcePlaylistId;
  },

  end() {
    _isDragging = false;
    _trackIds = [];
    _sourcePlaylistId = null;
    _hoveredPlaylistNodeId = null;
  },

  startNodeDrag(nodeId) {
    _draggingNodeId = nodeId;
  },

  endNodeDrag() {
    _draggingNodeId = null;
  },

  setHoveredPlaylistNode(id) {
    _hoveredPlaylistNodeId = id ?? null;
  },
};
