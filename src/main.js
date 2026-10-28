import '@fontsource/ibm-plex-sans-condensed/latin-500.css';
import '@fontsource/ibm-plex-sans-condensed/latin-600.css';
import '@fontsource/ibm-plex-sans-condensed/latin-700.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/ibm-plex-mono/latin-500.css';

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/flow.css';
import './styles/form.css';

import { initHeader } from './components/header.js';
import { initReveal } from './components/reveal.js';
import { initTrails } from './components/trails.js';
import { initFeed } from './components/feed.js';
import { initFlow } from './components/flow.js';
import { initResults } from './components/results.js';
import { initBookingForm } from './components/bookingForm.js';

document.documentElement.classList.add('js');

// Cada módulo es independiente: si uno falla, el resto de la página sigue funcionando
const safe = (name, fn) => {
  try {
    fn();
  } catch (err) {
    console.error(`[Montero Noctem] ${name}:`, err);
  }
};

safe('header', () => initHeader(document.querySelector('[data-header]')));
safe('reveal', () => initReveal());
safe('trails', () => initTrails(document.querySelector('[data-trails]')));
safe('feed', () => initFeed(document.querySelector('[data-feed]')));
safe('flow', () => initFlow(document.querySelector('[data-flow]')));
safe('results', () => initResults(document.querySelector('[data-results]')));
safe('bookingForm', () => initBookingForm(document.getElementById('formulario-contacto')));

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
