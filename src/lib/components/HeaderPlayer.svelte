<script>

  import { onMount } from 'svelte';
  import { icons } from '../icons';
  import IconButton from './IconButton.svelte';
  import { globals } from '../globals.svelte.js';
  import { formatTime, toMediaUrl, toAudioVolume } from '../helpers.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { contextMenu } from '../context-menu.svelte.js';

  const PLAYBAR_WIDTH = 400;

  let isPlaying = $state(false);
  let currentTime = $state(0);
  let duration = $state(0);
  let playbarProgress = $state(0);
  let playbarColumnHovered = $state(false);
  let playbarDragging = $state(false);

  let audioEl = $state();
  let playbarEl = $state();
  let preMuteVolume = $state(null);

  let library = $derived(globals.get('library'));
  let playingTrackId = $derived(globals.get('currentlyPlayingTrackId'));
  let playingTrack = $derived(library?.tracks?.[String(playingTrackId)] ?? null);

  let artist = $derived(playingTrack?.artist ?? '');
  let title = $derived(playingTrack?.name ?? '');

  // Library-provided duration (ms → s). Used as immediate source on loadstart
  // since audioEl.duration may be unavailable until the file is buffered.
  let trackLibraryDuration = $derived((playingTrack?.totalTime ?? 0) / 1000);

  let timeRemaining = $derived(Math.max(0, duration - currentTime));

  // Keep playbar in sync with audio time, except while user is dragging
  $effect(() => {

    if (!playbarDragging && duration > 0) {
      playbarProgress = currentTime / duration;
    }
  });

  onMount(() => {

    globals.update('audio', a => ({ ...a, header: audioEl }));
    audioEl.volume = toAudioVolume(globals.get('volume')?.header ?? 0.5);

    const savedOutput = globals.get('soundOutputs')?.header;

    if (savedOutput && audioEl.setSinkId) {
      audioEl.setSinkId(savedOutput).catch(() => {});
    }

    return () => globals.update('audio', a => ({ ...a, header: null }));
  });

  function handleLoadStart() {

    // Use library metadata immediately — audioEl.duration is not yet available.
    duration = trackLibraryDuration;
    currentTime = 0;
    playbarProgress = 0;
  }

  function handleTimeUpdate() {

    const t = audioEl.currentTime;

    if (!playbarDragging && isFinite(t)) currentTime = t;
  }

  function handleLoadedMetadata() {

    const d = audioEl.duration;
    const t = audioEl.currentTime;

    // Prefer audioEl.duration when valid; library metadata is already set from loadstart.
    if (isFinite(d) && d > 0) duration = d;
    if (isFinite(t)) currentTime = t;
  }

  // Catches formats that resolve duration after loadedmetadata (e.g. VBR MP3).
  function handleDurationChange() {

    const d = audioEl.duration;

    if (isFinite(d) && d > 0) duration = d;
  }

  function loadTrack(trackId, autoplay = true) {

    const track = library?.tracks?.[String(trackId)];
    if (!track?.location) return;

    globals.set('currentlyPlayingTrackId', trackId);
    audioEl.src = toMediaUrl(track.location);

    if (autoplay) {
      audioEl.play().catch(() => {});
    } else {
      audioEl.load();
    }
  }

  function togglePlayPause() {

    if (!audioEl.src) return;

    if (isPlaying) {
      audioEl.pause();
    } else {
      audioEl.play().catch(() => {});
    }
  }

  function handleNext() {

    const tracks = globals.get('currentPlayingTracks') ?? [];
    if (!tracks.length) return;

    const currentIdx = tracks.findIndex(t => t.trackId === playingTrackId);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + 1) % tracks.length;

    loadTrack(tracks[nextIdx].trackId, isPlaying);
  }

  function handlePrev() {

    // Playing and past 3 seconds: seek to beginning
    if (isPlaying && audioEl.currentTime > 3) {
      audioEl.currentTime = 0;
      return;
    }

    const tracks = globals.get('currentPlayingTracks') ?? [];
    if (!tracks.length) return;

    const currentIdx = tracks.findIndex(t => t.trackId === playingTrackId);
    if (currentIdx === -1) return;

    const prevIdx = currentIdx === 0 ? tracks.length - 1 : currentIdx - 1;

    loadTrack(tracks[prevIdx].trackId, isPlaying);
  }

  function handleEnded() {

    const tracks = globals.get('currentPlayingTracks') ?? [];
    if (!tracks.length) return;

    const currentIdx = tracks.findIndex(t => t.trackId === playingTrackId);
    if (currentIdx === -1) return;

    const nextIdx = (currentIdx + 1) % tracks.length;

    loadTrack(tracks[nextIdx].trackId, true);
  }

  function handlePlaybarMouseDown(e) {

    playbarDragging = true;
    updatePlaybarVisual(e.clientX);

    const handleMouseMove = (e) => updatePlaybarVisual(e.clientX);

    const handleMouseUp = () => {

      if (audioEl && duration > 0) {
        const seekTime = playbarProgress * duration;
        audioEl.currentTime = seekTime;
        currentTime = seekTime;
      }

      playbarDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function updatePlaybarVisual(clientX) {

    const rect = playbarEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    playbarProgress = x / rect.width;
  }

  async function handleSoundOutputClick(e) {

    if (contextMenu.visible) {
      contextMenu.hide();
      return;
    }

    const buttonEl = e.currentTarget;

    let devices;

    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      devices = all.filter(d => d.kind === 'audiooutput');
    } catch {
      return;
    }

    if (!devices.length) return;

    const savedOutput = globals.get('soundOutputs')?.header;
    const currentDeviceId = savedOutput ?? 'default';

    const items = devices.map(device => {

      const isSelected = device.deviceId === currentDeviceId;
      const label = device.label || 'Unknown Device';

      return {
        icon: 'volumeContextMenu',
        text: (isSelected ? '✓ ' : '') + label,
        callback: () => {

          if (audioEl.setSinkId) {
            audioEl.setSinkId(device.deviceId).catch(() => {});
          }

          globals.update('soundOutputs', s => ({ ...s, header: device.deviceId }));
          saveAppState();
        }
      };
    });

    contextMenu.show(e.clientX, e.clientY, items, buttonEl, 'target', 'target');
  }

  function toggleMute() {

    const current = globals.get('volume')?.header ?? 0.5;

    if (current > 0) {
      preMuteVolume = current;
      globals.update('volume', v => ({ ...v, header: 0 }));
    } else {
      globals.update('volume', v => ({ ...v, header: preMuteVolume ?? 0.5 }));
      preMuteVolume = null;
    }

    saveAppState();
  }

  $effect(() => {

    function handleKeyDown(e) {

      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;

      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
        return;
      }

      if (cmdOrCtrl && e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
        return;
      }

      if (cmdOrCtrl && e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
        return;
      }

      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  });

</script>

<audio
  bind:this={audioEl}
  onplay={() => isPlaying = true}
  onpause={() => isPlaying = false}
  onended={handleEnded}
  ontimeupdate={handleTimeUpdate}
  onloadstart={handleLoadStart}
  onloadedmetadata={handleLoadedMetadata}
  ondurationchange={handleDurationChange}
></audio>

<div class="player">

  <div class="transport-controls">
    <IconButton icon={icons.prev} onclick={handlePrev} />
    <IconButton 
      icon={isPlaying ? icons.pause : icons.play} 
      onclick={togglePlayPause}
      active={isPlaying}
    />
    <IconButton icon={icons.next} onclick={handleNext} />
  </div>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    bind:this={playbarEl}
    class="playbar-column"
    class:is-hovered={playbarColumnHovered || playbarDragging}
    style="width: {PLAYBAR_WIDTH}px"
    onmouseenter={() => playbarColumnHovered = true}
    onmouseleave={() => playbarColumnHovered = false}
    onmousedown={handlePlaybarMouseDown}
  >

    <div class="track-title-artist">
      <div class="track-label"><span>{title}</span></div>
      <div class="track-label artist"><span>{artist}</span></div>
    </div>

    <span class="time-remaining-min">-{formatTime(timeRemaining)}</span>

    
    <div class="playbar-wrapper">
      <div class="time-row">
        <span>{formatTime(duration > 0 ? currentTime : null)}</span>
        <span>-{formatTime(timeRemaining)}</span>
      </div>

      <div class="playbar">
        <div class="fillbar" style="width: {playbarProgress * 100}%"></div>
        <div
          class="knob"
          style="left: {playbarProgress * 100}%"
        ></div>
      </div>
    </div>

  </div>

  <IconButton icon={icons.loudspeaker} onclick={handleSoundOutputClick} />

</div>

<style>
  .player {
    display: flex;
    align-items: center;
    gap: 1em;
    height: var(--header-height);
    -webkit-app-region: no-drag;
  }

  .transport-controls {
    display: flex;
    align-items: center;
    gap: 0.25em;
  }

  .playbar-column {
    position: relative;
    align-self: stretch;
    overflow: visible;
    cursor: pointer;

    height: 100%;
  }

  .track-label {
    overflow: hidden;
    pointer-events: none;

    display: flex;
    align-items: center;

    transition: filter var(--td-250);
  }

  .track-label span {
    font-size: 0.875em;
    color: var(--fg2);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }

  .track-label.artist span {
    font-size: 0.75em;
    color: var(--fg1);
    font-weight: 600;
  }

  .playbar-column.is-hovered .track-label {
    filter: blur(2px);
  }

  .playbar-column.is-hovered .track-label span {
    color: var(--fg0-5);
  }

  .time-remaining-min {
    position: absolute;
    right: 0;
    bottom: 6px;
    font-size: 0.75em;
    color: var(--fg2);
    pointer-events: none;
    opacity: 1;
    transition: opacity var(--td-150) ease-out;
  }

  .playbar-column.is-hovered .time-remaining-min {
    opacity: 0;
    bottom: 12px;
  }

  .time-row {
    
    width: 100%;
    display: flex;
    justify-content: space-between;
    font-size: 0.75em;
    color: var(--fg3);
    font-weight: 600;
    letter-spacing: 0.02em;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--td-150) ease-out;
    margin-bottom: 0.5em;

    text-shadow: var(--txs);
  }

  .playbar-column.is-hovered .time-row {
    opacity: 1;
  }

  .playbar-wrapper {

    pointer-events: none;
    
    height: 2px;

    height: 100%;
    width: 100%;


    position: relative;
    top: 16px;
    bottom: 0;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    transition: top var(--td-150);
  }

  .playbar-column.is-hovered .playbar-wrapper {
    top: 0;

    bottom: 28px;

    z-index: 2;
  }

  .playbar {
    width: 100%;
    height: 2px;
    border-radius: 1px;
    background: var(--fg2-s);
    overflow: visible;
  }

  .fillbar {
    height: 100%;
    background: var(--yellow-warm);
    border-radius: inherit;
    pointer-events: none;
  }

  .knob {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: var(--fg3-s);
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--td-150);
  }

  .playbar-column.is-hovered .knob {
    opacity: 1;
  }

  .track-title-artist {
    position: absolute;
    left: 0;
    right: 0;
    height: 100%;
    pointer-events: none;

    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.1em;
  }

</style>
