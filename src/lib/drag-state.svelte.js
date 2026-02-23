let _isDragging = $state(false);
let _trackIds = $state([]);
let _sourcePlaylistId = $state(null);

export const dragStore = {
  get isDragging() { return _isDragging; },
  get trackIds() { return _trackIds; },
  get sourcePlaylistId() { return _sourcePlaylistId; },

  start(trackIds, sourcePlaylistId = null) {
    _isDragging = true;
    _trackIds = trackIds;
    _sourcePlaylistId = sourcePlaylistId;
  },

  end() {
    _isDragging = false;
    _trackIds = [];
    _sourcePlaylistId = null;
  },
};
