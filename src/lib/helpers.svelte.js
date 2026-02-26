// Returns a performance timestamp to be passed to tLog()
export const t = () => performance.now();

// Logs label + elapsed time formatted to 3 significant figures
export const tLog = (label, start) =>
  console.log(`${label}: ${Number((performance.now() - start).toPrecision(3))} ms`);

// Converts a file:// URL to a media:// URL for Electron's custom protocol handler.
// The media:// scheme is registered in main.js and proxies to the local file system.
export function toMediaUrl(fileUrl) {

  if (!fileUrl) return '';

  return fileUrl.replace(/^file:\/\//, 'media://');
}

// Maps a linear slider value [0, 1] to an audio amplitude [0, 1] via a -60 dB range.
// Gives "slow start, fast finish" — full resolution at quiet volumes.
export function toAudioVolume(linear) {

  if (linear <= 0) return 0;

  const MIN_DB = -60;

  return Math.pow(10, MIN_DB * (1 - linear) / 20);
}

// Formats seconds -> 'm:ss'. Returns '—' for null/undefined/NaN/Infinity.
export function formatTime(seconds) {

  if (seconds == null || !isFinite(seconds)) return '—';

  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);

  return `${m}:${String(s).padStart(2, '0')}`;
}
