<script>
  let {
    value = $bindable(''),
    el = $bindable(undefined),
    type = 'text',
    placeholder = '',
    min = undefined,
    max = undefined,
    step = undefined,
    width = '100%',
    textalign = 'left',
    oninput = undefined,
    onchange = undefined,
    onkeydown = undefined,
  } = $props();

  function handleInput(e) {
    value = e.target.value;
    oninput?.(e);
  }

  function handleChange(e) {
    value = e.target.value;
    onchange?.(e);
  }
</script>

<input
  bind:this={el}
  class="input-field"
  {type}
  {placeholder}
  {min}
  {max}
  {step}
  {value}
  style="width: {width}; text-align: {textalign};"
  oninput={handleInput}
  onchange={handleChange}
  {onkeydown}
/>

<style>
  .input-field {
    background-color: var(--overlay0);
    border: 1px solid var(--border2);
    border-radius: var(--brad1);
    color: var(--fg4);
    font-family: inherit;
    font-size: 1em;
    height: 2em;
    padding: 0 0.75em;
    outline: none;
    box-sizing: border-box;
    transition: border-color var(--td-100);
  }

  .input-field:focus {
    border-color: var(--border3);
  }

  .input-field::-webkit-outer-spin-button,
  .input-field::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
</style>
