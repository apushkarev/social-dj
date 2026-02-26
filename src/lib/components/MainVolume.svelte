<script>

  import { icons } from '../icons';
  import IconButton from './IconButton.svelte';
  import { globals } from '../globals.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import { toAudioVolume } from '../helpers.svelte.js';

  const VOLUME_SLIDER_WIDTH = 100;

  const MIN_DB = -60;

  let volumeVal = $derived(globals.get('volume')?.header ?? 0.5);
  let dbDisplay = $derived(volumeVal <= 0 ? '-\u221e dB' : Math.round(MIN_DB * (1 - volumeVal)) + ' dB');
  let volumeSliderHovered = $state(false);
  let volumeSliderDragging = $state(false);

  let volumeSliderEl = $state();

  // Reactively apply volume to audio element whenever it changes
  $effect(() => {

    const audio = globals.get('audio')?.header;
    if (audio) audio.volume = toAudioVolume(volumeVal);
  });

  function handleVolumeSliderMouseDown(e) {

    volumeSliderDragging = true;
    updateVolume(e.clientX);

    const handleMouseMove = (e) => updateVolume(e.clientX);
    const handleMouseUp = () => {

      volumeSliderDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function updateVolume(clientX) {

    const rect = volumeSliderEl.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));

    globals.update('volume', v => ({ ...v, header: x / rect.width }));
    saveAppState();
  }

</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="main-volume">

  <IconButton icon={icons.volume} disabled={true} />

  <div
    bind:this={volumeSliderEl}
    class="volume-slider"
    style="width: {VOLUME_SLIDER_WIDTH}px"
    onmouseenter={() => volumeSliderHovered = true}
    onmouseleave={() => volumeSliderHovered = false}
    onmousedown={handleVolumeSliderMouseDown}
  >
    <div class="volume-slider-bg">
      <div class="volume-slider-fill" style="width: {volumeVal * 100}%"></div>
      <div
        class="knob"
        class:hovered={volumeSliderHovered || volumeSliderDragging}
        style="left: {volumeVal * 100}%"
      ></div>
    </div>
  </div>

  <span class="db-label">{dbDisplay}</span>

</div>

<style>
  .main-volume {
    display: flex;
    align-items: center;
    gap: 8px;
    -webkit-app-region: no-drag;
  }

  .db-label {
    width: 3.5em;
    font-size: 0.875em;
    color: var(--fg2);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    text-align: right;
    flex-shrink: 0;
  }

  .volume-slider {
    height: 32px;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .volume-slider-bg {
    width: 100%;
    height: 2px;
    background: var(--fg2-s);
    border-radius: 1px;
    position: relative;
  }

  .volume-slider-fill {
    height: 100%;
    background: var(--yellow-warm);
    border-radius: 1px;
    pointer-events: none;
  }

  .knob {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 16px;
    height: 16px;
    background: var(--fg2-s);
    border-radius: 50%;
    transition:
      width var(--td-150),
      height var(--td-150),
      background var(--td-150);
    pointer-events: none;
  }

  .knob.hovered {
    width: 20px;
    height: 20px;
    background: var(--fg3-s);
  }
</style>
