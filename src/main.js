import { mount } from 'svelte';
import App from './App.svelte';
import { initializeDesignSystem } from './lib/design-system.js';
import './styles/global.css';

initializeDesignSystem();

const app = mount(App, { target: document.getElementById('app') });

export default app;
