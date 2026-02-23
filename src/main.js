import { mount } from 'svelte';
import App from './App.svelte';
import { initializeDesignSystem } from './lib/design-system.js';
import { initAppState } from './lib/app-state.svelte.js';
import { globals } from './lib/globals.svelte.js';
import './styles/global.css';

initializeDesignSystem();

let app;
initAppState().then(() => {
  // Apply saved font size before mount to avoid a flash at the default size
  document.documentElement.style.setProperty('--font-size', (globals.get('fontSize') ?? 16) + 'px');
  app = mount(App, { target: document.getElementById('app') });
});

export default app;
