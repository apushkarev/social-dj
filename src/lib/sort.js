// Color ordering for tag sort. Matches the CYCLE in PlaylistView.
export const TAG_CYCLE = [
  null,
  'var(--red)',
  'var(--bristol-orange)',
  'var(--yellow-warm)',
  'var(--meadow-green)',
  'var(--mint)',
  'var(--cornflower-blue)',
];

// Toggles sort direction between ascending (1) and descending (-1).
export function nextSortDirection(current) {

  return current === 1 ? -1 : 1;
}

// Returns TAG_CYCLE rank for a color value.
// null / unknown → last rank (always sorts to the end).
function tagRank(color) {

  const idx = TAG_CYCLE.indexOf(color);

  return idx <= 0 ? TAG_CYCLE.length : idx;
}

// Returns a sorted copy of tracks, or the original array when no sort is active.
// colorTags is the Map<string, string> of trackId → color.
// Original insertion indices are preserved for the 'num' column.
// For tag sort: null always appears last regardless of direction.
export function getSortedTracks(tracks, sortColumn, sortDirection, colorTags) {

  if (!sortColumn || sortDirection === 0) return tracks;

  const indexed = tracks.map((track, i) => ({ track, i }));

  indexed.sort(({ track: a, i: ai }, { track: b, i: bi }) => {

    switch (sortColumn) {

      case 'num':
        return sortDirection * (ai - bi);

      case 'tag': {

        const ra = tagRank(colorTags?.get(String(a.trackId)));
        const rb = tagRank(colorTags?.get(String(b.trackId)));
        const last = TAG_CYCLE.length;

        if (ra === last && rb === last) return 0;
        if (ra === last) return 1;
        if (rb === last) return -1;

        return sortDirection * (ra - rb);
      }

      case 'bpm':
        return sortDirection * ((a.bpm ?? 0) - (b.bpm ?? 0));

      case 'title':
        return sortDirection * (a.name ?? '').localeCompare(b.name ?? '');

      case 'time':
        return sortDirection * ((a.totalTime ?? 0) - (b.totalTime ?? 0));

      case 'artist':
        return sortDirection * (a.artist ?? '').localeCompare(b.artist ?? '');

      case 'comments':
        return sortDirection * (a.comments ?? '').localeCompare(b.comments ?? '');

      default:
        return 0;
    }
  });

  return indexed.map(item => item.track);
}
