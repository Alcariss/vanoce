const CACHE_NAME = 'vanocni-darky-v1.0';
const APP_VERSION = '1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './style.css',
  './script.js',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

// iOS-specific: Detect if running as standalone app
const isStandalone = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone === true;
};

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing... Version:', APP_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache:', CACHE_NAME);
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Failed to cache resources:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  // This is more aggressive for iOS PWAs
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Network request with fallback
        return fetch(event.request)
          .then(fetchResponse => {
            // Check if valid response
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Clone response for caching
            const responseToCache = fetchResponse.clone();
            
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return fetchResponse;
          })
          .catch(() => {
            // Return cached index.html for navigation requests when offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// Activate event - clean up old caches and handle updates
self.addEventListener('activate', event => {
  console.log('Service Worker activating... Version:', APP_VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated, claiming clients');
      // Claim all clients immediately
      return self.clients.claim();
    })
  );
});

// Handle messages from main app
self.addEventListener('message', event => {
  console.log('Service worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SKIP_WAITING message received, activating new service worker');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_INFO',
      version: APP_VERSION,
      cacheName: CACHE_NAME
    });
  }
});