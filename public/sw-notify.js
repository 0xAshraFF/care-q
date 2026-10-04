// Loaded into the generated service worker (see vite.config.ts). Tapping a referral notification
// brings the app to the front; the referral popup is already showing there.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of windows) {
        if ('focus' in w) return w.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(new URL('./#doctor', self.registration.scope).href);
    })(),
  );
});
