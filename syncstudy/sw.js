/* ============================================================
   Service Worker de SyncStudy (PWA)
   - Precachea el "app shell" (HTML/CSS/JS/íconos) para que la
     app sea instalable y abra rápido / offline.
   - NUNCA intercepta el backend: las llamadas a /api/ (REST y
     realtime SSE de PocketBase) y al admin /_/ van siempre a red.
   - Para actualizar archivos, subí el número de versión (CACHE).
   ============================================================ */

const CACHE = 'syncstudy-v2';

const APP_SHELL = [
  './',
  'index.html',
  'manifest.json',
  'css/reset.css',
  'css/variables.css',
  'css/layout.css',
  'css/components.css',
  'css/views.css',
  'js/data.js',
  'js/storage.js',
  'js/utils.js',
  'js/views.js',
  'js/app.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-512-maskable.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // No tocar otros orígenes (CDN de Lucide / PocketBase SDK) → red directa.
  if (url.origin !== self.location.origin) return;

  // No tocar NUNCA el backend: API REST, realtime SSE y panel admin.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_/')) return;

  // Navegaciones (abrir la app): red primero, y si no hay, el index cacheado.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.match('index.html', { ignoreSearch: true })
          .then((r) => r || caches.match('./'))
      )
    );
    return;
  }

  // Estáticos (HTML/CSS/JS/íconos): NETWORK-FIRST. Siempre traemos lo último
  // cuando hay internet (evita servir código viejo en desarrollo y demo), y
  // solo caemos al caché si la red falla (offline). Cacheamos cada respuesta
  // buena para que la app siga abriendo sin conexión.
  event.respondWith(
    fetch(req).then((resp) => {
      if (resp && resp.status === 200 && resp.type === 'basic') {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return resp;
    }).catch(() => caches.match(req, { ignoreSearch: true }))
  );
});
