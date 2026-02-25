const setRootCSSVariable = (name, value) => {
  document.documentElement.style.setProperty(name, value);
};

export const ds = {
  /* Backgrounds */
  '--bg1': 'rgba(0, 20, 26, 1)',
  '--bg2': 'rgba(0, 25, 34, 1)',
  '--bg2-5': 'rgb(0, 33, 46)',
  '--bg3': 'rgba(0, 40, 56, 1)',
  '--bg4': 'rgba(0, 48, 73, 1)',
  '--bg5': 'rgba(8, 55, 80, 1)',
  '--bg6': 'hsla(183, 23.46%, 19.44%, 100%)',

  '--intermediate1': '#B4C0BA',

  '--layout-bg1': 'rgba(0, 29, 41, 0.5)',
  '--layout-bg2': 'rgba(0, 40, 56, 0.5)',

  /* Blacks */
  '--black6': 'rgba(0, 0, 0, 1)',
  '--black4': 'rgba(0, 0, 0, 0.75)',
  '--black3-5': 'rgba(0, 0, 0, 0.5)',
  '--black3': 'rgba(0, 0, 0, 0.4)',
  '--black2': 'rgba(0, 0, 0, 0.25)',

  '--bg-delete': 'rgb(127, 38, 24)',

  /* Foregrounds (alpha) */
  '--fg6': 'rgb(255, 255, 255)',
  '--fg5': 'rgba(255, 255, 255, 0.8)',
  '--fg4': 'rgba(255, 255, 255, 0.75)',
  '--fg3': 'rgba(255, 255, 255, 0.65)',
  '--fg2-5': 'rgba(255, 255, 255, 0.575)',
  '--fg2': 'rgba(255, 255, 255, 0.50)',
  '--fg1': 'rgba(255, 255, 255, 0.4)',
  '--fg0-5': 'rgba(255, 255, 255, 0.325)',
  '--fg0': 'rgba(255, 255, 255, 0.25)',

  /* Foregrounds (solid, pre-blended on --bg1: #00141a) */
  '--fg6-s': '#ffffff',
  '--fg5-s': '#ccced0',
  '--fg4-s': '#c0c3c5',
  '--fg3-s': '#a6adb1',
  '--fg2-5-s': '#93a0a5',
  '--fg2-s': '#808d93',
  '--fg1-s': '#667781',
  '--fg0-5-s': '#546470',
  '--fg0-s': '#405560',

  /* Overlays */
  '--overlay0': 'rgba(255, 255, 255, 0.01)',
  '--overlay1': 'rgba(255, 255, 255, 0.05)',
  '--overlay2': 'rgba(255, 255, 255, 0.1)',
  '--overlay3': 'rgba(255, 255, 255, 0.25)',
  '--overlay4': 'rgba(255, 255, 255, 0.4)',
  '--overlay5': 'rgba(255, 255, 255, 0.5)',

  /* Borders */
  '--border1': 'rgba(255, 255, 255, 0.02)',
  '--border2': 'rgba(255, 255, 255, 0.05)',
  '--border3': 'rgba(255, 255, 255, 0.1)',
  '--border4': 'rgba(255, 255, 255, 0.25)',
  '--border5': 'rgba(255, 255, 255, 0.35)',
  '--border7': 'rgba(255, 255, 255, 0.65)',

  /* Accent colors */
  '--yellow-cool': '#e5d863',

  '--yellow-warm-25': 'rgb(228 193 68 / 0.25)',
  '--yellow-warm-80': 'rgb(204 160 0)',
  
  '--red-50': 'rgb(127, 38, 22)',
  '--bristol-orange-50': 'rgb(128, 61, 13)',
  '--yellow-warm-50': 'rgb(128 90 0)',
  '--meadow-green-50': 'rgb(84, 128, 13)',
  '--mint-50': 'rgb(13, 128, 120)',
  '--cornflower-blue-50': 'rgb(13, 61, 128)',

  '--red': 'rgb(248, 147, 128)',
  '--bristol-orange': 'rgb(255, 181, 97)',
  '--yellow-warm': '#e5c345',
  '--meadow-green': 'rgb(155, 194, 91)',
  '--mint': 'rgb(39, 194, 184)',
  '--cornflower-blue': 'rgb(102, 150, 217)',

  /* Timing */

  '--td-75': '75ms',
  '--td-100': '100ms',
  '--td-150': '150ms',
  '--td-200': '200ms',
  '--td-250': '250ms',
  '--td-350': '350ms',
  '--td-500': '500ms',
  '--td-750': '750ms',
  '--td-1000': '1000ms',
  '--td-1250': '1250ms',
  '--td-1500': '1500ms',
  '--td-2000': '2000ms',

  '--brad1': '6px',
  '--brad2': '10px',
  '--brad3': '16px',
  '--brad4': '22px',

  '--bxs': '0 4px 32px rgba(0, 0, 0, 0.2)',
  '--txs': '0 1px 2px rgba(0, 0, 0, 1)',

  '--titlebar-height': '56px'
};

export const initializeDesignSystem = () => {
  Object.entries(ds).forEach(([key, value]) => {
    setRootCSSVariable(key, value);
  });
};
