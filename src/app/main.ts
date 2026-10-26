import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-mono/latin-500.css';
import '../shared/ui/base.css';
import '../features/poster/poster.css';
import { initAudio } from '../features/audio/audio';
import { useStore } from '../state/store';
import { t } from '../shared/i18n/id';

// Entry stays tiny: React + three load only after "Masuk", so the poster is the whole first paint.
const enter = document.getElementById('enter') as HTMLButtonElement;
const status = document.getElementById('poster-status')!;
enter.disabled = false;

// Retry = reload and start again: loaders cache a failed request, a fresh page does not.
const AUTOSTART = 'rumah-web:autostart';
let failed = false;

enter.addEventListener('click', async () => {
  if (failed) {
    try { sessionStorage.setItem(AUTOSTART, '1'); } catch { /* private mode: the user clicks Masuk once more */ }
    location.reload();
    return;
  }
  enter.disabled = true;
  initAudio(useStore.getState().sound); // inside the click: browsers allow audio only after a user gesture
  status.textContent = t.loading;
  try {
    const { mountTour } = await import('./tour');
    await mountTour(document.getElementById('app')!, (msg) => (status.textContent = msg));
    const poster = document.getElementById('poster')!;
    poster.classList.add('is-leaving');
    poster.inert = true; // hidden poster must leave the tab order and the accessibility tree
  } catch (err) {
    console.error(err);
    const noWebgl = err instanceof Error && err.message === t.noWebgl;
    status.textContent = noWebgl ? t.noWebgl : t.loadFailed;
    enter.textContent = t.retry;
    enter.disabled = noWebgl; // retrying cannot fix a missing WebGL
    failed = true;
  }
});

try {
  if (sessionStorage.getItem(AUTOSTART)) { sessionStorage.removeItem(AUTOSTART); enter.click(); }
} catch { /* storage blocked: no autostart */ }
