const CACHE_NAME = 'dinutri-v2';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// Apenas assets verdadeiramente estáticos (ícones, manifest).
// IMPORTANTE: NÃO incluir '/' aqui — o index.html DEVE sempre vir da rede
// para garantir que referências a novos bundles (com hash) sejam carregadas.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon.svg',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/logo_dinutri.png',
  '/nova_logo_dinutri.png'
];

// ─── Install ───
self.addEventListener('install', (event) => {
  console.log('[SW] Installing with cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.log('[SW] Error caching static assets:', error);
      })
  );
  // Força a ativação imediata assim que o novo worker for instalado.
  // Isso garante que o evento 'controllerchange' no cliente dispare o mais rápido possível.
  self.skipWaiting();
});

// ─── Activate ───
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating with cache:', CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Limpeza agressiva: remove QUALQUER cache que não seja o atual
              return name.startsWith('dinutri-') &&
                     name !== STATIC_CACHE &&
                     name !== DYNAMIC_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Cache cleanup completed, claiming clients');
        // Reivindica o controle de todas as abas abertas imediatamente
        return self.clients.claim();
      })
  );
});

// ─── Fetch ───
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignorar requests não-GET e extensões do Chrome
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }

  const url = new URL(request.url);

  // ── API requests: Network-only (sem cache de respostas API) ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // ── Navigation (HTML): Network-first SEMPRE ──
  // Isso é CRÍTICO: garante que o index.html atualizado (com referências
  // aos novos bundles JS/CSS com hash) seja servido após cada deploy.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/'));
        })
    );
    return;
  }

  // ── Assets com hash do Vite (ex: /assets/index-a1b2c3d4.js): Cache-first ──
  // Esses arquivos são IMUTÁVEIS — o hash no nome muda quando o conteúdo muda.
  // É seguro servir do cache porque o novo index.html referencia os novos hashes.
  if (url.pathname.startsWith('/assets/') && /[-_.][a-f0-9]{8,}\./i.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // ── Outros assets estáticos (ícones, fontes, imagens sem hash): Network-first ──
  // Evita que versões antigas fiquem presas no cache indefinidamente.
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Background sync ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(Promise.resolve());
  }
});

// ─── Push notifications ───
self.addEventListener('push', (event) => {
  console.log('[SW] Push message received');
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/',
        type: data.type || 'message',
      },
      actions: [
        { action: 'explore', title: 'Ver detalhes' },
        { action: 'close', title: 'Fechar' }
      ]
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'DiNutri', options)
    );
  }
});

// ─── Notification click ───
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click received:', event.notification.data);
  event.notification.close();

  let targetUrl = '/';
  if (event.notification.data) {
    const data = typeof event.notification.data === 'string'
      ? JSON.parse(event.notification.data)
      : event.notification.data;
    if (data.url) {
      targetUrl = data.url;
    } else if (data.type === 'plan') {
      targetUrl = '/my-plan';
    } else if (data.type === 'assessment') {
      targetUrl = '/assessments';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Message handler ───
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.action === 'SKIP_WAITING') {
    console.log('[SW] SKIP_WAITING received, activating new version...');
    self.skipWaiting().then(() => {
      console.log('[SW] Skipped waiting successfully');
      self.clients.matchAll().then((allClients) => {
        allClients.forEach((client) => {
          client.postMessage({ action: 'SW_UPDATED' });
        });
      });
    });
  }

  // Comando para limpar todos os caches manualmente
  if (event.data && event.data.action === 'CLEAR_ALL_CACHES') {
    console.log('[SW] Clearing all caches...');
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    }).then(() => {
      console.log('[SW] All caches cleared');
      self.clients.matchAll().then((allClients) => {
        allClients.forEach((client) => {
          client.postMessage({ action: 'CACHES_CLEARED' });
        });
      });
    });
  }
});
