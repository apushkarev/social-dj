const STORAGE_KEY = 'color-tags';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(obj) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

let tags = $state(load());

export const colorTags = {
  get(trackId) {
    return tags[String(trackId)] ?? null;
  },

  set(trackId, color) {
    const next = { ...tags };
    if (color === null) {
      delete next[String(trackId)];
    } else {
      next[String(trackId)] = color;
    }
    tags = next;
    save(tags);
  },
};
