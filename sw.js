const CACHE_NAME = 'hcf-v4.2';
const DYNAMIC_CACHE = 'hcf-dynamic-v4.2';
const MAX_DYNAMIC_ITEMS = 50;

const CRITICAL_ASSETS = [
  '/', '/index.html', '/offline.html', '/main.css', '/main.js', '/shark_logo.png', '/manifest.json'
];
const OPTIONAL_ASSETS = [
  '/classes.html', '/pricing.html', '/team.html', '/news.html', '/faq.html', '/philosophy.html',
  '/philosophy-cinematic.css', '/philosophy-cinematic.js',
  '/hero1.jpg', '/schedule.png', '/schedule-mobile.png', '/schedule-pc.png',
  '/coach_huang.jpg', '/coach_allen.jpg', '/coach_zhengyu.jpg', '/coach_kao.jpg', '/coach_hu.jpg', '/coach_mi.jpg',
  '/assets/triangle.png', '/assets/anchor.png', '/assets/shark.png', '/assets/final-logo.png',
];

// Trim dynamic cache to MAX_DYNAMIC_ITEMS (LRU)
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await Promise.all(keys.slice(0, keys.length - maxItems).map((key) => cache.delete(key)));
  }
}

// Install: pre-cache shell assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(CRITICAL_ASSETS);
      for (const url of OPTIONAL_ASSETS) {
        try { await cache.add(url); } catch (e) { console.warn('Optional cache skip:', url); }
      }
    })
  );
});

// Activate: clean up old caches and notify clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll().then((clients) =>
          clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' }))
        )
      )
  );
});

// Fetch: routing strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Network Only with offline fallback: Netlify Functions / API
  if (url.origin === self.location.origin && url.pathname.startsWith('/.netlify/')) {
    event.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: '⚡ 目前離線，請連上網路後再試' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Stale-While-Revalidate: external CDN resources (Tailwind, Font Awesome, Google Fonts, etc.)
  if (url.origin !== self.location.origin) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              cache.put(request, response.clone());
              trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
              return response;
            })
            .catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Network First: HTML pages (navigation requests)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html'))
        )
    );
    return;
  }

  // Cache First: static assets (images, audio, CSS, JS)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, clone);
          trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
        });
        return response;
      });
    })
  );
});
