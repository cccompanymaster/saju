/* 조선사주 서비스워커 — 오프라인·설치(PWA)
 * - 앱 셸 precache, 동일 출처 정적자원 stale-while-revalidate
 * - 내비게이션 network-first(폴백: 캐시된 /m/)
 * - /api/ 는 캐시하지 않음(항상 네트워크)
 */
const VERSION = 'joseon-v1';
const SHELL = [
  '/m/',
  '/m/css/app.css',
  '/m/css/idol-hero.css',
  '/m/js/funnel.js',
  '/m/js/idol-hero.js',
  '/manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API: 항상 네트워크 (캐시 금지)
  if (url.pathname.startsWith('/api/')) return;

  // 다른 출처(CDN/폰트/토스): 브라우저 기본 처리
  if (url.origin !== self.location.origin) return;

  // 내비게이션: network-first → 실패 시 캐시된 /m/
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/m/')));
    return;
  }

  // 정적: stale-while-revalidate
  e.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
