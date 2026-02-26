<script>

  import { icons } from '../icons';
  import IconButton from './IconButton.svelte';

  const PLAYBAR_WIDTH = 400;
  const DURATION = 237; // placeholder: 3:57

  let isPlaying = $state(false);
  let playbarProgress = $state(0.33);
  let playbarColumnHovered = $state(false);
  let playbarDragging = $state(false);

  let playbarEl = $state();

  let artist = $state('Melanie Martinez');
  let title = $state('Pacify Her');

  let currentTime = $derived(Math.round(playbarProgress * DURATION));
  let timeRemaining = $derived(DURATION - currentTime);

  function formatTime(seconds) {

    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function togglePlayPause() {
    
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  export function pause() {
    isPlaying = false;
  }

  export function play() {
    isPlaying = true;
  }

  function handlePrev() {
    console.log('Previous track');
  }

  function handleNext() {
    console.log('Next track');
  }

  function handlePlaybarMouseDown(e) {

    playbarDragging = true;
    updatePlaybarProgress(e.clientX);

    const handleMouseMove = (e) => updatePlaybarProgress(e.clientX);
    const handleMouseUp = () => {

      playbarDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function updatePlaybarProgress(clientX) {

    const rect = playbarEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    playbarProgress = x / rect.width;
  }

</script>

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

    <div class="track-label">{artist} - {title}</div>

    <span class="time-remaining-min">-{formatTime(timeRemaining)}</span>

    
    <div class="playbar-wrapper">
      <div class="time-row">
        <span>{formatTime(currentTime)}</span>
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
    position: absolute;
    left: 0;
    right: 0;
    height: 100%;
    text-align: left;
    font-size: 1em;
    color: var(--fg2);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    pointer-events: none;

    display: flex;
    align-items: center;

    transition: filter var(--td-250)
  }

  .playbar-column.is-hovered .track-label {
    filter: blur(2px);
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
    width: 24px;
    height: 24px;
    background: var(--fg3-s);
    border-radius: 50%;
    pointer-events: none;
    opacity: 0;
    transition: opacity var(--td-150);
  }

  .playbar-column.is-hovered .knob {
    opacity: 1;
  }

</style>
