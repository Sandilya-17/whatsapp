// ConnectNow Service Worker
// Network-first: always try to load the newest version of the app, and only fall back
// to the saved copy when offline. This lets updates reach phones right away.
const CACHE_NAME = 'connectnow-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-site GET requests; leave API calls, uploads and WebSockets alone.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/ws') ||
    url.pathname.startsWith('/uploads/')
  ) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => cached || caches.match('/index.html'))
      )
  );
});


// ---------------------------------------------------------------------------
// Push notifications: messages, calls and missed calls, even when the app is closed
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ConnectNow', body: event.data ? event.data.text() : 'New notification' };
  }

  event.waitUntil(
    (async () => {
      const title = data.title || 'ConnectNow';
      const icon = data.icon || '/icon-192.png';
      let options = {
        body: data.body || '',
        icon,
        badge: '/icon-192.png',
        tag: data.tag || undefined,
        renotify: !!data.tag,
        timestamp: data.ts || Date.now(),
        data: { type: data.type, conversationId: data.conversationId, callerId: data.callerId },
      };
      let heading = title;

      if (data.type === 'call') {
        // A call push that arrives late is no longer ringing: show it as a missed call instead
        const stale = data.ts && Date.now() - data.ts > 45000;
        if (stale) {
          options.body = 'Missed ' + (data.callType === 'video' ? 'video' : 'voice') + ' call';
          options.data.type = 'missed_call';
        } else {
          options.requireInteraction = true;
          options.vibrate = [400, 200, 400, 200, 400, 200, 400];
          options.silent = false;
        }
      } else if (data.type === 'missed_call') {
        options.vibrate = [200, 100, 200];
      } else {
        // Stack several messages from the same chat into one notification
        options.vibrate = [120, 60, 120];
        const existing = data.tag ? await self.registration.getNotifications({ tag: data.tag }) : [];
        let lines = [];
        let count = 1;
        if (existing.length > 0) {
          const prev = existing[0].data || {};
          lines = Array.isArray(prev.lines) ? prev.lines.slice(-4) : [existing[0].body];
          count = (prev.count || 1) + 1;
        }
        lines.push(data.body || '');
        options.data.lines = lines;
        options.data.count = count;
        if (count > 1) {
          options.body = lines.join('\n');
          heading = title + ' (' + count + ' messages)';
        }
      }

      if (self.navigator && typeof self.navigator.setAppBadge === 'function' && typeof data.unread === 'number' && data.unread > 0) {
        try { await self.navigator.setAppBadge(data.unread); } catch (e) { /* unsupported */ }
      }

      await self.registration.showNotification(heading, options);
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  const info = event.notification.data || {};
  event.notification.close();

  let url = '/';
  if (info.type === 'call') url = '/?call=1';
  else if (info.conversationId) url = '/?c=' + info.conversationId;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.length > 0) {
        const client = windows.find((c) => c.visibilityState === 'visible') || windows[0];
        try { await client.focus(); } catch (e) { /* ignore */ }
        if (info.type === 'call') client.postMessage({ type: 'check-call' });
        else if (info.conversationId) client.postMessage({ type: 'open-conversation', conversationId: info.conversationId });
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});
