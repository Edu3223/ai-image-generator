// Service Worker para AI Image Generator
// Versión del cache - cambiar cuando se actualice la app
const CACHE_NAME = 'ai-image-generator-v1.0.0';
const STATIC_CACHE = 'static-v1.0.0';
const DYNAMIC_CACHE = 'dynamic-v1.0.0';

// Archivos que se cachearán para funcionalidad offline
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/storage.js',
  '/js/ai-generator.js',
  '/js/gallery.js',
  '/js/config.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  // Firebase SDK (se cachearán dinámicamente)
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage-compat.js'
];

// URLs que nunca se deben cachear
const NEVER_CACHE = [
  '/api/',
  'chrome-extension://',
  'moz-extension://'
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log('SW: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('SW: Cacheando archivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('SW: Instalación completada');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('SW: Error durante la instalación:', error);
      })
  );
});

// Activar Service Worker
self.addEventListener('activate', event => {
  console.log('SW: Activando...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Eliminar caches antiguos
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('SW: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('SW: Activación completada');
        return self.clients.claim();
      })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // No cachear ciertas URLs
  if (NEVER_CACHE.some(pattern => request.url.includes(pattern))) {
    return;
  }
  
  // Estrategia Cache First para archivos estáticos
  if (STATIC_FILES.includes(url.pathname) || request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }
  
  // Estrategia Network First para APIs y contenido dinámico
  if (request.url.includes('/api/') || request.url.includes('huggingface.co')) {
    event.respondWith(networkFirst(request));
    return;
  }
  
  // Estrategia Stale While Revalidate para el resto
  event.respondWith(staleWhileRevalidate(request));
});

// Estrategia Cache First
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    // Cachear la respuesta si es exitosa
    if (networkResponse.status === 200) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('SW: Error en Cache First:', error);
    
    // Fallback para páginas HTML
    if (request.destination === 'document') {
      return caches.match('/index.html');
    }
    
    // Fallback para imágenes
    if (request.destination === 'image') {
      return new Response('', { status: 404 });
    }
    
    throw error;
  }
}

// Estrategia Network First
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cachear respuestas exitosas en cache dinámico
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('SW: Red no disponible, buscando en cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Respuesta offline personalizada
    if (request.url.includes('/api/')) {
      return new Response(JSON.stringify({
        error: 'Sin conexión',
        message: 'Esta función requiere conexión a internet',
        offline: true
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Estrategia Stale While Revalidate
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(error => {
    console.log('SW: Error de red en Stale While Revalidate:', error);
    return cachedResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// Manejar mensajes del cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }).then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Manejar notificaciones push (para futuras funcionalidades)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nueva imagen generada',
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Ver imagen',
          icon: '/assets/icons/icon-96x96.png'
        },
        {
          action: 'close',
          title: 'Cerrar'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'AI Image Generator', options)
    );
  }
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?action=gallery')
    );
  }
});

// Sincronización en segundo plano (para futuras funcionalidades)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Aquí se pueden sincronizar datos pendientes cuando se recupere la conexión
    console.log('SW: Ejecutando sincronización en segundo plano');
    
    // Ejemplo: enviar imágenes pendientes de subir
    const pendingUploads = await getPendingUploads();
    for (const upload of pendingUploads) {
      await uploadImage(upload);
    }
  } catch (error) {
    console.error('SW: Error en sincronización:', error);
  }
}

// Funciones auxiliares para sincronización (placeholder)
async function getPendingUploads() {
  // Implementar lógica para obtener uploads pendientes
  return [];
}

async function uploadImage(upload) {
  // Implementar lógica para subir imagen
  console.log('SW: Subiendo imagen:', upload);
}

