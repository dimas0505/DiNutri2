const CACHE_NAME = 'dinutri-v1'; // Production cache version
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // Icons
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/logo_dinutri.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing with cache:', CACHE_NAME);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS); // Cache '/' on install for offline fallback
      })
      .catch((error) => {
        console.log('Error caching static assets:', error);
      })
  );
  // Don't skip waiting immediately - wait for user action
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating with cache:', CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete all caches that start with 'dinutri-' but are not the current ones
              return cacheName.startsWith('dinutri-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Cache cleanup completed');
        // Take control of all existing clients immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and Chrome extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle API requests with network-first strategy
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone response for caching
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => {
              cache.put(request, responseClone);
            });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request);
        })
    );
    return;
  }
  
  // Network-first for navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the new page for offline access
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => {
            cache.put(request.url, responseClone);
          });
          return networkResponse;
        })
        .catch(() => {
          // If network fails, serve the cached HTML
          return caches.match(request.url) || caches.match('/');
        })
    );
    return;
  }

  // Handle other static assets with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return from cache if found
        if (response) {
          return response;
        }

        // If not in cache, fetch from network and cache it
        return fetch(request)
          .then((fetchResponse) => {
            // Cache successful responses
            if (fetchResponse.status === 200) {
              const responseClone = fetchResponse.clone();
              caches.open(DYNAMIC_CACHE)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return fetchResponse;
          });
      })
  );
});

// Background sync for offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Background sync triggered');
    event.waitUntil(
      // Implement offline sync logic here
      Promise.resolve()
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('Push message received');

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Ver detalhes',
          icon: '/icon-192x192.png'
        },
        {
          action: 'close',
          title: 'Fechar',
          icon: '/icon-192x192.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'DiNutri', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received');

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for update commands
self.addEventListener('message', (event) => {
  console.log('Message received in SW:', event.data);

  if (event.data && event.data.action === 'SKIP_WAITING') {
    console.log('SKIP_WAITING message received, updating service worker...');
    self.skipWaiting().then(() => {
      console.log('Service worker skipped waiting successfully');
      // Notify all clients that the new SW is ready
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ action: 'SW_UPDATED' });
        });
      });
    });
  }
});