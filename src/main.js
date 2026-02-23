import { mount } from 'svelte';
import App from './App.svelte';
import { initializeDesignSystem } from './lib/design-system.js';
import { initAppState } from './lib/app-state.svelte.js';
import './styles/global.css';

initializeDesignSystem();

let app;
initAppState().then(() => {
  app = mount(App, { target: document.getElementById('app') });
});

export default app;
