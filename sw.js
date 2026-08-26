// 층간케어 서비스워커 - 최소 구성 (설치 가능성 확보 + 기본 오프라인 캐시)
// v2: 네트워크 우선 방식으로 변경 - 항상 최신 배포를 먼저 시도하고,
// 오프라인일 때만 캐시된 예전 버전을 보여줌 (예전 cache-first 방식은
// index.html을 계속 옛 버전으로 캐시해버려서 배포 반영이 안 되는 문제가 있었음)
const CACHE_NAME = 'noise-care-v2';
const CORE_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // API/Supabase 요청은 항상 네트워크로
  if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
