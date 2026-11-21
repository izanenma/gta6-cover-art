// Neon Coast — the cover engine. Draws a GTA-style multi-panel poster onto any
// canvas: a photo per panel (each with its own zoom and position), a Vice City
// neon-sunset grade, bold Anton title lettering with a Pacifico subtitle, plus
// grain and a vignette so the print feels like poster art, not a photo filter.
//
// state: { layout: 'grid' | 'hero' | 'full', grade: 'sunset' | 'neon' | 'teal',
//          title, subtitle, panels: [{ img, zoom, dx, dy }] } — four panels;
//          'full' uses panels[0] only, the others stay as spares.

export const LAYOUTS = ['grid', 'hero', 'full'];

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.3) contrast(1.08) brightness(1.02)',
    washes: [
      { from: 'rgba(255, 122, 26, 0.34)', to: 'rgba(255, 36, 120, 0.34)', mode: 'overlay' },
      { from: 'rgba(255, 190, 90, 0.10)', to: 'rgba(120, 20, 90, 0.22)', mode: 'soft-light' },
    ],
    accent: '#ffb03a',
  },
  neon: {
    label: 'Neon Night',
    filter: 'saturate(1.45) contrast(1.16) brightness(0.98)',
    washes: [
      { from: 'rgba(255, 45, 149, 0.38)', to: 'rgba(0, 229, 255, 0.30)', mode: 'overlay' },
      { from: 'rgba(140, 40, 255, 0.16)', to: 'rgba(0, 40, 80, 0.26)', mode: 'soft-light' },
    ],
    accent: '#ff5da2',
  },
  teal: {
    label: 'Teal Heat',
    filter: 'saturate(1.15) contrast(1.06) brightness(1.03)',
    washes: [
      { from: 'rgba(0, 224, 200, 0.30)', to: 'rgba(255, 120, 40, 0.28)', mode: 'overlay' },
      { from: 'rgba(0, 120, 110, 0.14)', to: 'rgba(255, 150, 60, 0.14)', mode: 'soft-light' },
    ],
    accent: '#4de3d1',
  },
};

let noisePattern = null;
function grain(ctx, w, h) {
  if (!noisePattern) {
    const n = document.createElement('canvas');
    n.width = 128; n.height = 128;
    const nx = n.getContext('2d');
    const data = nx.createImageData(128, 128);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 118 + Math.floor(Math.random() * 40);
      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v; data.data[i + 3] = 255;
    }
    nx.putImageData(data, 0, 0);
    noisePattern = ctx.createPattern(n, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = noisePattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10, 4, 20, 0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawPanel(ctx, img, x, y, pw, ph, zoom, dx, dy, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, pw, ph);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
    g.addColorStop(0, '#3a1c5e');
    g.addColorStop(1, '#12081f');
    ctx.fillStyle = g;
    ctx.fillRect(x, y, pw, ph);
  } else {
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * zoom;
    const iw = img.naturalWidth * base;
    const ih = img.naturalHeight * base;
    const cx = x + pw / 2 + dx * pw;
    const cy = y + ph / 2 + dy * ph;
    ctx.filter = grade.filter;
    ctx.drawImage(img, cx - iw / 2, cy - ih / 2, iw, ih);
    ctx.filter = 'none';
    for (const wash of grade.washes) {
      const g = ctx.createLinearGradient(x, y, x + pw, y + ph);
      g.addColorStop(0, wash.from);
      g.addColorStop(1, wash.to);
      ctx.globalCompositeOperation = wash.mode;
      ctx.fillStyle = g;
      ctx.fillRect(x, y, pw, ph);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  // Inked panel edge, poster style.
  ctx.strokeStyle = 'rgba(12, 4, 24, 0.55)';
  ctx.lineWidth = Math.max(2, pw * 0.006);
  ctx.strokeRect(x, y, pw, ph);
  ctx.restore();
}

function fitFont(ctx, text, fontFamily, startSize, maxWidth, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

function drawTitleBlock(ctx, w, h, y0, bandH, state, grade) {
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim();
  ctx.fillStyle = '#f7f2fa';
  ctx.fillRect(0, y0, w, bandH);
  // Thin neon rule above the title band.
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, y0, w, Math.max(4, h * 0.006));
  let textY = y0 + bandH * 0.52;
  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, '"Pacifico", cursive', bandH * 0.30, w * 0.8);
    ctx.font = `${subSize}px "Pacifico", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, w / 2, y0 + bandH * 0.30);
    textY = y0 + bandH * 0.82;
  }
  if (!title) return;
  const size = fitFont(ctx, title, '"Anton", sans-serif', bandH * 0.52, w * 0.92);
  ctx.font = `${size}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = size * 0.07;
  ctx.strokeText(title, w / 2, textY);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(20, 8, 31, 0.35)';
  ctx.shadowBlur = size * 0.08;
  ctx.shadowOffsetY = size * 0.03;
  ctx.fillText(title, w / 2, textY);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.textBaseline = 'alphabetic';
}

function drawOverlayTitle(ctx, w, h, state, grade) {
  // Title over the photo itself (full-bleed layout): dark scrim, then the same
  // lettering, anchored to the foot of the frame.
  const bandH = h * 0.24;
  const y0 = h - bandH;
  const scrim = ctx.createLinearGradient(0, y0 - h * 0.10, 0, h);
  scrim.addColorStop(0, 'rgba(10, 4, 20, 0)');
  scrim.addColorStop(1, 'rgba(10, 4, 20, 0.82)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, y0 - h * 0.10, w, bandH + h * 0.10);
  ctx.fillStyle = grade.accent;
  ctx.fillRect(0, y0, w, Math.max(4, h * 0.006));
  const title = state.title.trim().toUpperCase();
  const subtitle = state.subtitle.trim();
  if (subtitle) {
    const subSize = fitFont(ctx, subtitle, '"Pacifico", cursive', bandH * 0.34, w * 0.8);
    ctx.font = `${subSize}px "Pacifico", cursive`;
    ctx.textAlign = 'center';
    ctx.fillStyle = grade.accent;
    ctx.fillText(subtitle, w / 2, y0 + bandH * 0.32);
  }
  if (!title) return;
  const size = fitFont(ctx, title, '"Anton", sans-serif', bandH * 0.5, w * 0.92);
  ctx.font = `${size}px "Anton", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14081f';
  ctx.lineWidth = size * 0.07;
  ctx.strokeText(title, w / 2, y0 + bandH * 0.72);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, w / 2, y0 + bandH * 0.72);
  ctx.textBaseline = 'alphabetic';
}

/** Draws the whole cover for `state` onto `canvas` at the canvas's own size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const panels = state.panels;
  const p = (i) => panels[i] ?? { img: null, zoom: 1, dx: 0, dy: 0 };

  ctx.fillStyle = '#f7f2fa';
  ctx.fillRect(0, 0, w, h);

  if (state.layout === 'full') {
    const one = p(0);
    drawPanel(ctx, one.img, 0, 0, w, h, one.zoom, one.dx, one.dy, grade);
    drawOverlayTitle(ctx, w, h, state, grade);
  } else if (state.layout === 'hero') {
    const bandH = h * 0.20;
    const areaH = h - bandH;
    const m = w * 0.014;
    const g = w * 0.014;
    const heroW = w * 0.60;
    const hero = p(0);
    drawPanel(ctx, hero.img, m, m, heroW, areaH - 2 * m, hero.zoom, hero.dx, hero.dy, grade);
    const colX = m + heroW + g;
    const colW = w - colX - m;
    const rowH = (areaH - 2 * m - 2 * g) / 3;
    for (let i = 0; i < 3; i++) {
      const panel = p(i + 1);
      drawPanel(ctx, panel.img, colX, m + i * (rowH + g), colW, rowH, panel.zoom, panel.dx, panel.dy, grade);
    }
    drawTitleBlock(ctx, w, h, areaH, bandH, state, grade);
  } else {
    // grid: 2 x 2 panels above the title band.
    const bandH = h * 0.20;
    const areaH = h - bandH;
    const m = w * 0.014;
    const g = w * 0.014;
    const cellW = (w - 2 * m - g) / 2;
    const cellH = (areaH - 2 * m - g) / 2;
    for (let i = 0; i < 4; i++) {
      const panel = p(i);
      const x = m + (i % 2) * (cellW + g);
      const y = m + Math.floor(i / 2) * (cellH + g);
      drawPanel(ctx, panel.img, x, y, cellW, cellH, panel.zoom, panel.dx, panel.dy, grade);
    }
    drawTitleBlock(ctx, w, h, areaH, bandH, state, grade);
  }

  grain(ctx, w, h);
  vignette(ctx, w, h);
}

/** Renders `state` to a fresh canvas of `width` x `height` and returns it. */
export function renderCover(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  drawCover(canvas, state);
  return canvas;
}
