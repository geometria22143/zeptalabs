// ==========================================================================
// ZeptaLabs Web Push Notification Utility (Chrome / Google Browser Push)
// ==========================================================================

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    return reg;
  } catch (err) {
    console.warn('Service worker registration note:', err);
    return null;
  }
}

export async function requestBrowserNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  return false;
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function triggerPushNotification(options: {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const title = options.title || 'ZeptaLabs Official Update';
  const icon = options.icon || 'logo.png';
  const notificationOptions = {
    body: options.body,
    icon: icon,
    badge: icon,
    tag: options.tag || 'zeptalabs-update',
    renotify: true,
    data: {
      url: options.url || '/',
    },
  } as NotificationOptions;

  // Try service worker showNotification first (native Chrome desktop/mobile behavior)
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, notificationOptions);
        return;
      }
    }
  } catch (swErr) {
    console.warn('Service worker showNotification notice, fallback to window:', swErr);
  }

  // Fallback to Window Notification
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notif.close();
    };
  } catch (winErr) {
    console.warn('Window Notification error:', winErr);
  }
}
