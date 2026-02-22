<script>
  import { globals } from '../globals.svelte.js';
  import { treeState } from '../tree-state.svelte.js';

  let { show } = $props();

  let el;
  let fileInput;

  let visible = $state(false);
  let status = $state(null); // null | 'loading' | 'success' | 'error'
  let errorMsg = $state('');

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
      <h2 class="subheading">Library management</h2>

      <div class="import-block">
        <button class="import-btn" onclick={() => fileInput.click()}>
          Import iTunes Library
        </button>

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
    transition: opacity var(--td-350);
  }

  .settings.visible {
    opacity: 1;
    pointer-events: all;
  }

  .settings-inner {
    padding: 48px;
    max-width: 600px;
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
    letter-spacing: 0.1em;
    color: var(--fg2);
  }

  .import-block {
    display: flex;
    flex-direction: column;
    gap: 0.75em;
  }

  .import-btn {
    align-self: flex-start;
    padding: 0.5em 1em;
    box-sizing: border-box;
    background: var(--overlay1);
    border: 1px solid var(--border1-5);
    border-radius: var(--brad1);
    color: var(--fg4);
    font-size: 1em;
    cursor: pointer;
    transition: background var(--td-100), border-color var(--td-100), color var(--td-100);
  }

  .import-btn:hover {
    background: var(--overlay2);
    border-color: var(--border2);
    color: var(--fg5);
  }

  .import-btn:active {
    background: var(--overlay1);
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
  }

  .status-msg.loading { color: var(--fg2); }
  .status-msg.success { color: var(--meadow-green); }
  .status-msg.error   { color: var(--red); }

  .file-input-hidden {
    display: none;
  }
</style>
