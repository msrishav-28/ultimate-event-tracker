// Service Worker for College Event Tracker PWA
const CACHE_NAME = 'college-events-v1';
const STATIC_CACHE = 'college-events-static-v1';
const DYNAMIC_CACHE = 'college-events-dynamic-v1';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/sw.js',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE)
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Handle API calls - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful API responses
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if offline
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Return offline page or error
              return new Response(JSON.stringify({
                error: 'Offline',
                message: 'You are currently offline. Please check your connection.'
              }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Handle static assets - cache first
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cache the response
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => cache.put(request, responseClone));

            return response;
          })
          .catch(() => {
            // Return offline fallback for HTML pages
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push message received:', event);

  if (!event.data) {
    console.log('Push message but no payload');
    return;
  }

  const data = event.data.json();
  console.log('Push notification data:', data);

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    data: data.data || {},
    actions: data.actions || [
      {
        action: 'view',
        title: 'View Event'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification click received:', event);

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action === 'dismiss') {
    // Just dismiss, no navigation
    return;
  }

  // Default action or 'view' action
  const urlToOpen = data.eventId
    ? `${self.location.origin}/event/${data.eventId}`
    : `${self.location.origin}/`;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Check if there is already a window/tab open with the target URL
        for (let client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If not, open a new window/tab with the target URL
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle background sync for offline reminder processing (future enhancement)
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'reminder-sync') {
    event.waitUntil(syncReminders());
  }
});

async function syncReminders() {
  // This would sync any pending reminders when the app comes back online
  console.log('Syncing reminders...');
  // Implementation would go here
}
