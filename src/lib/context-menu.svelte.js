let state = $state({
  visible: false,
  x: 0,
  y: 0,
  items: [],
  anchor: null,
  anchorAlignX: 'mouse', // target or mouse
  anchorAlignY: 'target' // target or mouse
});

export const contextMenu = {

  // anchor: optional DOM element — when provided, the menu positions itself
  // below that element instead of at the raw x/y cursor coordinates.
  show(x, y, items, anchor = null, aaX, aaY) {
    state.x = x;
    state.y = y;
    state.items = items;
    state.anchor = anchor;
    state.visible = true;
    state.anchorAlignX = aaX;
    state.anchorAlignY = aaY;

    console.log(state);
  },

  hide() {
    state.visible = false;
    state.anchor = null;
  },

  get visible()       { return state.visible; },
  get x()             { return state.x; },
  get y()             { return state.y; },
  get items()         { return state.items; },
  get anchor()        { return state.anchor; },
  get anchorAlignX()  { return state.anchorAlignX; },
  get anchorAlignY()  { return state.anchorAlignY; },
};
