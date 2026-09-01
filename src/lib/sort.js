// Color ordering for tag sort. Matches the CYCLE in PlaylistView.
export const TAG_CYCLE = [
  null,
  'var(--cornflower-blue)',
  'var(--mint)',
  'var(--meadow-green)',
  'var(--yellow-warm)',
  'var(--bristol-orange)',
  'var(--red)',
];

// Toggles sort direction between ascending (1) and descending (-1).
export function nextSortDirection(current) {

  return current === 1 ? -1 : 1;
}

// Returns TAG_CYCLE rank for a color value.
// null / unknown → highest rank, i.e. ordered after every color.
function tagRank(color) {

  const idx = TAG_CYCLE.indexOf(color);

  return idx <= 0 ? TAG_CYCLE.length : idx;
}

// Returns a sorted copy of tracks, or the original array when no sort is active.
// colorTags is the Map<string, string> of trackId → color.
// Original insertion indices are preserved for the 'num' column.
// For tag (color) sort: descending runs blue → red then untagged, ascending
// is its mirror — untagged, then red → blue.
export function getSortedTracks(tracks, sortColumn, sortDirection, colorTags, tagsSortOrder = {}) {

  if (!sortColumn || sortDirection === 0) return tracks;

  const indexed = tracks.map((track, i) => ({ track, i }));

  indexed.sort(({ track: a, i: ai }, { track: b, i: bi }) => {

    switch (sortColumn) {

      case 'num':
        return sortDirection * (ai - bi);

      case 'tag': {

        const ra = tagRank(colorTags?.get(String(a.trackId)));
        const rb = tagRank(colorTags?.get(String(b.trackId)));

        // Descending walks TAG_CYCLE forward — blue, mint, green, yellow,
        // orange, red — and leaves untagged last; ascending is the exact
        // mirror, untagged first then red back down to blue. Both are the
        // same total order, so untagged needs no special case: its rank
        // already sits after every color. Direction is negated because
        // rank 1 (blue) is the head of the descending run.
        return -sortDirection * (ra - rb);
      }

      case 'bpm':
        return sortDirection * ((a.bpm ?? 0) - (b.bpm ?? 0));

      case 'title':
        return sortDirection * (a.name ?? '').localeCompare(b.name ?? '');

      case 'time':
        return sortDirection * ((a.totalTime ?? 0) - (b.totalTime ?? 0));
      
      case 'date-added':
        return sortDirection * ((new Date(a.dateAdded).getTime() ?? 0) - (new Date(b.dateAdded).getTime() ?? 0));

      case 'artist':
        return sortDirection * (a.artist ?? '').localeCompare(b.artist ?? '');

      case 'tags': {
        const ta = a.tags ?? [];
        const tb = b.tags ?? [];

        // Tracks with no tags always go last regardless of direction
        if (!ta.length && !tb.length) return 0;
        if (!ta.length) return 1;
        if (!tb.length) return -1;

        // Lexicographic comparison by sort order number
        const len = Math.min(ta.length, tb.length);
        for (let i = 0; i < len; i++) {
          const oa = tagsSortOrder[ta[i]] ?? Infinity;
          const ob = tagsSortOrder[tb[i]] ?? Infinity;
          if (oa !== ob) return sortDirection * (oa - ob);
        }

        // All compared elements equal — shorter array comes first
        return sortDirection * (ta.length - tb.length);
      }

      default:
        return 0;
    }
  });

  return indexed.map(item => item.track);
}
