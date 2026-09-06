// StockControl · Controle de Estoque — Service Worker
const CACHE_VERSION = 'stockcontrol-v1';
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  './',
  './index.html',
  './script.js',
  './style.css',
  './logopc.png',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-192.png',
  './icons/icon-maskable-512.png'
];

const CDN_HOSTS = [
  'cdnjs.cloudflare.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

function isCdnRequest(url) {
  return CDN_HOSTS.some((host) => url.hostname === host);
}

// Network-first para navegação (HTML), com fallback offline em cache
async function handleNavigation(request) {
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(PRECACHE);
    cache.put('./index.html', fresh.clone());
    return fresh;
  } catch (err) {
    const cache = await caches.open(PRECACHE);
    const cached = await cache.match('./index.html');
    return cached || Response.error();
  }
}

// Cache-first para assets same-origin (js/css/icons/manifest)
async function handleStaticAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const fresh = await fetch(request);
    const cache = await caches.open(PRECACHE);
    cache.put(request, fresh.clone());
    return fresh;
  } catch (err) {
    return cached || Response.error();
  }
}

// Stale-while-revalidate para CDN (fontes, ícones, jsPDF)
async function handleCdnAsset(request) {
  const cache = await caches.open(RUNTIME);
  const cached = await cache.match(request);
  const networkFetch = fetch(request)
    .then((response) => {
      // Recursos cross-origin (fontes, ícones, libs) geralmente chegam como
      // resposta opaca (no-cors) — cacheamos mesmo sem poder inspecionar o status.
      if (response && (response.ok || response.type === 'opaque')) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  return cached || networkFetch;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (isCdnRequest(url)) {
    event.respondWith(handleCdnAsset(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(handleStaticAsset(request));
  }
});
