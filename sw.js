const CACHE = 'liquid-commands-v3';
const FILES = ['./', './index.html', './manifest.json', './icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.all(FILES.map(f => c.add(f).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first; if offline OR the server answers with an error (404/5xx), use the cached copy.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
          return res;
        }
        return caches.match(e.request)
          .then(r => r || caches.match('./index.html'))
          .then(r => r || res);
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
