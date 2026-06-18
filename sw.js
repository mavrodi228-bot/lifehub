self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const notification = readPushPayload(event);
  event.waitUntil(handlePush(notification));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(openLifeHub(event.notification.data?.url || './'));
});

function readPushPayload(event) {
  try {
    return event.data?.json() || {};
  } catch {
    return {
      title: 'LifeHub',
      body: event.data?.text() || 'Есть новое уведомление.',
    };
  }
}

async function handlePush(notification) {
  const openClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  const visibleClient = openClients.find((client) => client.visibilityState === 'visible');

  if (visibleClient) {
    visibleClient.postMessage({
      type: 'lifehub:push',
      notification,
    });
    return;
  }

  await self.registration.showNotification(notification.title || 'LifeHub', {
    body: notification.body || 'Есть новое уведомление.',
    icon: 'icon.svg',
    badge: 'icon.svg',
    tag: notification.tag || notification.id || 'lifehub',
    renotify: false,
    data: {
      url: notification.url || './',
      id: notification.id,
      type: notification.type,
    },
  });
}

async function openLifeHub(url) {
  const openClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  const existingClient = openClients.find((client) => 'focus' in client);
  if (existingClient) {
    await existingClient.focus();
    if ('navigate' in existingClient) {
      await existingClient.navigate(url);
    }
    return;
  }

  if (self.clients.openWindow) {
    await self.clients.openWindow(url);
  }
}
