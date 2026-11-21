// Wires the page: pick photos, a layout and a grade, type the caption, nudge each
// panel into place, export the cover as a PNG in three post sizes. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { drawCover, renderCover, GRADES, LAYOUTS } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const zoomInput = document.getElementById('zoom');
const xInput = document.getElementById('panx');
const yInput = document.getElementById('pany');

const SAMPLES = {
  boulevard: 'samples/boulevard.jpg',
  pier: 'samples/pier.jpg',
};

const state = {
  layout: 'grid',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Neon Shore nights',
  panels: [
    { img: null, zoom: 1, dx: 0, dy: 0 },
    { img: null, zoom: 1, dx: 0, dy: 0 },
    { img: null, zoom: 1, dx: 0, dy: 0 },
    { img: null, zoom: 1, dx: 0, dy: 0 },
  ],
};
let selectedPanel = 0;
let fontsReady = false;

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('40px Pacifico'),
    ]);
  } catch { /* fall back to system fonts */ }
  fontsReady = true;
}

function redraw() {
  drawCover(canvas, state);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function syncPanelControls() {
  const panel = state.panels[selectedPanel];
  zoomInput.value = panel.zoom;
  xInput.value = panel.dx;
  yInput.value = panel.dy;
  document.querySelectorAll('[data-panel]').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.panel) === selectedPanel);
  });
  document.querySelectorAll('[data-sample]').forEach((b) => {
    b.classList.toggle('active', panel.sample === b.dataset.sample);
  });
}

function setPanelPhoto(img, sample) {
  const panel = state.panels[selectedPanel];
  panel.img = img;
  panel.sample = sample ?? null;
  panel.zoom = 1;
  panel.dx = 0;
  panel.dy = 0;
  syncPanelControls();
  redraw();
}

// Layout and grade pickers.
document.querySelectorAll('[data-layout]').forEach((b) => {
  b.addEventListener('click', () => {
    state.layout = b.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((b) => {
  b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x === b));
    redraw();
  });
});

// Panel picker and its photo.
document.querySelectorAll('[data-panel]').forEach((b) => {
  b.addEventListener('click', () => {
    selectedPanel = Number(b.dataset.panel);
    syncPanelControls();
  });
});
document.querySelectorAll('[data-sample]').forEach((b) => {
  b.addEventListener('click', async () => {
    setPanelPhoto(await loadImage(SAMPLES[b.dataset.sample]), b.dataset.sample);
  });
});
document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setPanelPhoto(await loadImage(URL.createObjectURL(file)), null);
  status.textContent = `Loaded ${file.name} into panel ${selectedPanel + 1}`;
});

// Caption.
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });

// Crop and position for the selected panel.
zoomInput.addEventListener('input', () => { state.panels[selectedPanel].zoom = Number(zoomInput.value); redraw(); });
xInput.addEventListener('input', () => { state.panels[selectedPanel].dx = Number(xInput.value); redraw(); });
yInput.addEventListener('input', () => { state.panels[selectedPanel].dy = Number(yInput.value); redraw(); });

// Exports: one click per post size.
document.querySelectorAll('[data-export]').forEach((b) => {
  b.addEventListener('click', () => {
    const [w, h] = b.dataset.export.split('x').map(Number);
    const out = renderCover(state, w, h);
    out.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `cover-${w}x${h}.png`;
      a.click();
      status.textContent = `Saved cover-${w}x${h}.png`;
    }, 'image/png');
  });
});

async function boot() {
  await ensureFonts();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), async (scene) => {
      state.layout = LAYOUTS.includes(scene.layout) ? scene.layout : 'grid';
      state.grade = scene.grade in GRADES ? scene.grade : 'sunset';
      state.title = scene.title;
      state.subtitle = scene.subtitle;
      titleInput.value = scene.title;
      subtitleInput.value = scene.subtitle;
      document.querySelectorAll('[data-layout]').forEach((x) => x.classList.toggle('active', x.dataset.layout === state.layout));
      document.querySelectorAll('[data-grade]').forEach((x) => x.classList.toggle('active', x.dataset.grade === state.grade));
      for (let i = 0; i < 4; i++) {
        const name = scene.photos[i % scene.photos.length];
        state.panels[i] = { img: await loadImage(SAMPLES[name] ?? SAMPLES.pier), zoom: 1, dx: 0, dy: 0, sample: name };
      }
      redraw();
    });
    return;
  }
  // Default scene: pier and boulevard alternating across the grid.
  const names = ['pier', 'boulevard', 'pier', 'boulevard'];
  for (let i = 0; i < 4; i++) {
    state.panels[i] = { img: await loadImage(SAMPLES[names[i]]), zoom: 1, dx: 0, dy: 0, sample: names[i] };
  }
  syncPanelControls();
  redraw();
}

boot();
