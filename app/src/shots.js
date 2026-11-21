// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo;
// ?shot=cover shows the cover alone. `layout`, `grade`, `caption`, `subtitle` and
// `photos` (comma-separated sample names, one per panel) pick the scene.
// window.__shotReady is set once painted.
export async function runShot(shot, query, load) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await load({
    layout: query.get('layout') ?? 'grid',
    grade: query.get('grade') ?? 'sunset',
    title: query.get('caption') ?? 'Sunset Heist',
    subtitle: query.get('subtitle') ?? 'Neon Shore nights',
    photos: (query.get('photos') ?? 'pier,boulevard,pier,boulevard').split(','),
  });
  await document.fonts.ready;
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
