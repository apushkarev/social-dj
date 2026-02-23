let state = $state({
  visible: false,
  x: 0,
  y: 0,
  items: [],
});

export const contextMenu = {

  show(x, y, items) {
    state.x = x;
    state.y = y;
    state.items = items;
    state.visible = true;
  },

  hide() {
    state.visible = false;
  },

  get visible() { return state.visible; },
  get x()       { return state.x; },
  get y()       { return state.y; },
  get items()   { return state.items; },
};
