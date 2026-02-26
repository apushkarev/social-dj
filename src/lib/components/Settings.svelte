<script>
  import { globals } from '../globals.svelte.js';
  import { treeState } from '../tree-state.svelte.js';
  import { saveAppState } from '../app-state.svelte.js';
  import Button from './Button.svelte';
  import InputField from './InputField.svelte';

  let { show } = $props();

  let el;
  let fileInput;

  let visible = $state(false);
  let status = $state(null); // null | 'loading' | 'success' | 'error'
  let errorMsg = $state('');

  // Font size
  let fontSize = $state(globals.get('fontSize') ?? 16);

  $effect(() => {
    fontSize = globals.get('fontSize') ?? 16;
  });

  function setFontSize(val) {
    const clamped = Math.round(Math.min(32, Math.max(8, val)) * 2) / 2;
    fontSize = clamped;
    globals.set('fontSize', clamped);
    saveAppState();
  }

  function increaseFontSize() { setFontSize(fontSize + 0.5); }
  function decreaseFontSize() { setFontSize(fontSize - 0.5); }

  function handleFontSizeChange(e) {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) setFontSize(val);
  }

  $effect(() => {
    if (show) {
      el.style.display = 'flex';
      requestAnimationFrame(() => {
        visible = true;
      });
    } else {
      visible = false;
    }
  });

  function onTransitionEnd(e) {
    if (e.propertyName === 'opacity' && !visible) {
      el.style.display = 'none';
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    status = 'loading';
    errorMsg = '';

    try {
      const xmlContent = await file.text();
      const result = await window.electronAPI.parseLibrary(xmlContent);

      if (result.success) {
        treeState.reset();
        globals.set('selectedPlaylistId', null);
        globals.set('library', result.data);
        status = 'success';
      } else {
        errorMsg = result.error;
        status = 'error';
      }
    } catch (err) {
      errorMsg = err.message;
      status = 'error';
    }

    fileInput.value = '';
  }
</script>

<div
  class="settings"
  class:visible
  bind:this={el}
  ontransitionend={onTransitionEnd}
>
  <div class="settings-inner">
    <h1 class="heading">Settings</h1>

    <section class="section">
      <h2 class="subheading">Appearance</h2>

      <div class="setting-row">
        <span class="setting-label">Font size</span>
        <div class="font-size-control">
          <button class="step-btn" onclick={decreaseFontSize}>−</button>
          <InputField
            type="number"
            value={fontSize}
            min={8}
            max={32}
            step={0.5}
            width="4em"
            textalign="center"
            onchange={handleFontSizeChange}
          />
          <button class="step-btn" onclick={increaseFontSize}>+</button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="subheading">Sound setup</h2>

      
    </section>

    <section class="section">
      <h2 class="subheading">Library management</h2>

      <div class="import-block">
        <Button onclick={() => fileInput.click()}>Import iTunes Library</Button>

        <p class="hint">
          iTunes Library can be exported in File → Library → Export Library
          Save it to a file and then import it
        </p>

        {#if status === 'loading'}
          <p class="status-msg loading">Importing…</p>
        {:else if status === 'success'}
          <p class="status-msg success">Library imported successfully.</p>
        {:else if status === 'error'}
          <p class="status-msg error">Error: {errorMsg}</p>
        {/if}
      </div>

      <input
        type="file"
        accept=".xml"
        class="file-input-hidden"
        bind:this={fileInput}
        onchange={handleFileChange}
      />
    </section>
  </div>
</div>

<style>
  .settings {
    position: absolute;
    inset: 0;
    z-index: 10;
    background-color: var(--bg1);
    display: none;
    opacity: 0;
    overflow-y: auto;
    pointer-events: none;
    transition: opacity var(--td-250);
  }

  .settings.visible {
    opacity: 1;
    pointer-events: all;
  }

  .settings-inner {
    padding: 3em;
    max-width: 37.5em;
  }

  .heading {
    margin: 0 0 1.25em 0;
    font-size: 1.5em;
    font-weight: 600;
    color: var(--fg2);
  }

  .section {
    margin-bottom: 2.5em;
  }

  .subheading {
    margin: 0 0 1.25em 0;
    font-size: 1em;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.067em;
    color: var(--fg2);
  }

  .import-block {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
  }

  .hint {
    margin: 0;
    font-size: 0.8125em;
    color: var(--fg1);
    line-height: 1.6;
    letter-spacing: 0.01em;
    font-weight: 500;
    max-width: 32em;
  }

  .status-msg {
    margin: 0;
    font-size: 0.8125em;
    letter-spacing: 0.03em;
  }

  .status-msg.loading { color: var(--fg2); }
  .status-msg.success { color: var(--meadow-green); }
  .status-msg.error   { color: var(--red); }

  .file-input-hidden {
    display: none;
  }

  .setting-row {
    display: flex;
    align-items: center;
    gap: 1em;
  }

  .setting-label {
    font-size: 0.875em;
    font-weight: 500;
    color: var(--fg3);
  }

  .font-size-control {
    display: flex;
    align-items: center;
    gap: 0.375em;
  }

  .step-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2em;
    height: 2em;
    border: 1px solid var(--border2);
    border-radius: var(--brad1);
    background-color: var(--overlay1);
    color: var(--fg3);
    font-size: 1em;
    font-family: inherit;
    cursor: pointer;
    transition: background-color var(--td-100);
  }

  .step-btn:hover {
    background-color: var(--overlay5);
  }
</style>
