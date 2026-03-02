<script>
  import { icons } from '../icons.js';
  import AddTagItem from './AddTagItem.svelte';

  let showModal = $state(false);
  let modalType = $state('tag');
  let modalX = $state(0);
  let modalY = $state(0);

  function handleAddTag(e) {
    e.stopPropagation();
    modalType = 'tag';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }

  function handleAddTagGroup(e) {
    e.stopPropagation();
    modalType = 'tag-group';
    modalX = e.clientX;
    modalY = e.clientY + 8;
    showModal = true;
  }
</script>

<div class="heading-row" data-snap-row>
  <span class="heading-label">Tags</span>

  <span class="node-actions" onclick={e => e.stopPropagation()}>
    <span
      class="action-icon"
      title="Add tag"
      onclick={handleAddTag}
    >{@html icons.addPlaylist}</span>

    <span
      class="action-icon"
      title="Add tag group"
      onclick={handleAddTagGroup}
    >{@html icons.addFolder}</span>
  </span>
</div>

<AddTagItem
  type={modalType}
  parentGroupId={null}
  parentGroupName="Tags"
  x={modalX}
  y={modalY}
  bind:visible={showModal}
/>

<style>
  .heading-row {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    border: none;
    background: none;
    font-family: inherit;
    padding: 0.75em 0.75em;
    box-sizing: border-box;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    color: var(--fg2-s);
  }

  .heading-label {
    flex: 1;
    font-size: 1.125em;
    font-weight: 600;
    letter-spacing: 0.02em;
    text-transform: uppercase;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .node-actions {
    display: flex;
    align-items: center;
    gap: 1em;
    flex-shrink: 0;
  }

  .action-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg2-s);
    cursor: pointer;

    transition: color var(--td-100);
  }

  .action-icon:hover {
    color: var(--fg3-s);
  }

  .action-icon:active {
    color: var(--fg5-s);
  }
</style>
