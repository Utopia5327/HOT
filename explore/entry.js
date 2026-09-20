import {PROJECT_LINKS, projectURL} from './project-links.js';

const shell = document.getElementById('gallery-shell');
const entry = document.getElementById('gallery-entry');
const message = document.getElementById('entry-message');
const launch = document.getElementById('launch-gallery');
const title = document.getElementById('entry-title');
const loader = document.getElementById('entry-loader');
let frame = null;
let slowLoadTimer;

function setLoading(loading) {
  loader.hidden = !loading;
  loader.setAttribute('aria-busy', String(loading));
  title.textContent = loading ? 'Loading the gallery.' : 'Explore in 3D.';
}

// Use the same shared header as the existing pages. The host already loads theme.js.
async function loadHeader() {
  const target = document.getElementById('site-header');
  try {
    const response = await fetch('../header.html');
    if (!response.ok) throw new Error('Header unavailable');
    target.innerHTML = await response.text();
    for (const original of target.querySelectorAll('script')) {
      if (original.src) { original.remove(); continue; }
      const script = document.createElement('script');
      script.textContent = original.textContent;
      original.replaceWith(script);
    }
    const dock = document.getElementById('fluidDock');
    if (dock) new MutationObserver(syncPause).observe(dock, {attributes:true, attributeFilter:['data-expanded']});
    syncPause();
  } catch {
    const link = document.createElement('a');
    link.href = '../Computational%20Design.html';
    link.textContent = '← Browse projects';
    link.style.cssText = 'position:fixed;top:24px;left:24px;z-index:100;color:inherit;font:12px "Fira Mono",monospace';
    target.replaceChildren(link);
  }
}

function send(type, detail = {}) {
  frame?.contentWindow?.postMessage({type, ...detail}, location.origin);
}

function syncPause() {
  const dockOpen = document.getElementById('fluidDock')?.dataset.expanded === 'true';
  send('spatial:pause', {paused: document.hidden || !!dockOpen, navigationOpen: !!dockOpen});
  if (frame) frame.inert = !!dockOpen;
}

function syncTheme() {
  send('spatial:theme', {theme: document.documentElement.dataset.theme || 'light'});
}

function showFallback(text, retry = true) {
  clearTimeout(slowLoadTimer);
  setLoading(false);
  frame?.remove();
  frame = null;
  document.body.classList.remove('gallery-ready');
  entry.hidden = false;
  message.textContent = text;
  launch.hidden = !retry;
  launch.textContent = 'Try 3D again ↗';
}

function supportsWebGL() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2');
  if (!gl) return false;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return true;
}

function openGallery() {
  if (frame) return;
  try {
    if (!supportsWebGL()) {
      showFallback('The 3D view is unavailable on this device. You can explore all the work in the project index.', false);
      return;
    }
  } catch {
    showFallback('The 3D view is unavailable on this device. You can explore all the work in the project index.', false);
    return;
  }
  launch.hidden = true;
  setLoading(true);
  message.textContent = 'Please wait while the 3D gallery opens. Your first visit may take a little longer.';
  const sceneURL = new URL('./scene/index.html', import.meta.url);
  const requested = new URLSearchParams(location.search).get('project');
  if (Object.hasOwn(PROJECT_LINKS, requested)) sceneURL.hash = new URLSearchParams({project:requested}).toString();
  frame = document.createElement('iframe');
  frame.id = 'gallery-frame';
  frame.title = 'Explore Manas Bhatia’s 3D gallery';
  frame.allow = 'autoplay; fullscreen';
  frame.src = sceneURL.href;
  frame.addEventListener('load', () => { syncTheme(); syncPause(); });
  shell.prepend(frame);
  // Offer an exit while a slow connection continues loading; don't abort a viable load.
  slowLoadTimer = setTimeout(() => {
    message.textContent = 'The gallery is still loading. You can browse the project pages while it opens.';
  }, 45000);
}

window.addEventListener('message', event => {
  if (!frame || event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'spatial:ready') {
    clearTimeout(slowLoadTimer);
    setLoading(false);
    entry.hidden = true;
    document.body.classList.add('gallery-ready');
    syncTheme();
    syncPause();
  } else if (event.data?.type === 'spatial:error') {
    showFallback('The gallery could not load. Browse the projects, or try opening the 3D view again.');
  } else if (event.data?.type === 'spatial:open-project') {
    const url = projectURL(event.data.projectId, location.origin);
    if (url) { send('spatial:pause', {paused:true}); location.assign(url.href); }
  }
});

launch.addEventListener('click', openGallery);
window.addEventListener('themeChange', syncTheme);
window.addEventListener('storage', event => { if (event.key === 'theme') syncTheme(); });
window.addEventListener('pagehide', () => send('spatial:pause', {paused:true}));
window.addEventListener('pageshow', syncPause);
document.addEventListener('visibilitychange', syncPause);
loadHeader();

const mobile = matchMedia('(max-width:820px)').matches;
const saveData = navigator.connection?.saveData || matchMedia('(prefers-reduced-data:reduce)').matches;
if (mobile || saveData) {
  setLoading(false);
  message.textContent = mobile
    ? 'Explore the projects in the portfolio, or step inside the 3D gallery. The 3D experience works best on a larger screen.'
    : 'Browse the portfolio to use less data, or choose to load the 3D gallery.';
  launch.hidden = false;
} else {
  openGallery();
}
