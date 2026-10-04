// Phone notifications for referrals. These work while the app is open or recently in the background.
// Reaching a doctor whose app is fully closed needs server push (Firebase Cloud Messaging), which
// isn't set up yet.

export type NotifyPermission = NotificationPermission | 'unsupported';

export function notifyPermission(): NotifyPermission {
  return typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';
}

/** Must be called from a tap (browsers ignore permission requests that aren't). */
export async function askNotifyPermission(): Promise<NotifyPermission> {
  if (notifyPermission() !== 'default') return notifyPermission();
  try {
    return await Notification.requestPermission();
  } catch {
    return notifyPermission();
  }
}

export async function notify(title: string, body: string, tag: string): Promise<void> {
  if (notifyPermission() !== 'granted') return;
  const options = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', vibrate: [250, 120, 250], renotify: true };
  try {
    // Android Chrome only shows notifications through the service worker.
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, options as NotificationOptions);
      return;
    }
  } catch {
    // fall through
  }
  try {
    new Notification(title, options as NotificationOptions);
  } catch {
    // Not available here.
  }
}
