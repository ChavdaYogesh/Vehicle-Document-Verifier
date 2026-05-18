import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

const SW_URL = '/api/firebase/sw';

async function getFirebaseWebConfig() {
  const res = await fetch('/api/firebase/config');
  if (!res.ok) {
    throw new Error('Firebase web config is missing. Add NEXT_PUBLIC_FIREBASE_* to .env.local and restart the dev server.');
  }
  return res.json();
}

async function unregisterLegacyWorkers() {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((reg) => {
        const url = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
        return url.includes('firebase-messaging-sw.js') || url.includes('/api/firebase/sw');
      })
      .map((reg) => reg.unregister())
  );
}

function mapFirebaseError(err) {
  const msg = err?.message || '';
  const code = err?.code || '';

  if (msg.includes('push service not available') || code === 'messaging/failed-service-worker-registration') {
    return (
      'Push service unavailable. Use Chrome or Edge, open http://localhost:3000 (not an embedded preview), ' +
      'allow notifications, and confirm NEXT_PUBLIC_FIREBASE_VAPID_KEY matches your Firebase Web Push key pair.'
    );
  }
  if (code === 'messaging/permission-blocked') {
    return 'Notifications are blocked. Enable them in your browser site settings for this page.';
  }
  return msg || 'Failed to register for push notifications';
}

export async function registerForPushNotifications() {
  if (typeof window === 'undefined') {
    throw new Error('Push registration must run in the browser');
  }

  if (!window.isSecureContext) {
    throw new Error('Push requires a secure context. Use http://localhost or HTTPS.');
  }

  if (!(await isSupported())) {
    throw new Error('Push notifications are not supported in this browser. Try Chrome or Edge on desktop/Android.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  const webConfig = await getFirebaseWebConfig();
  const vapidKey = webConfig.vapidKey || process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set in .env.local');
  }

  await unregisterLegacyWorkers();

  // Reset Firebase app so messaging binds to the new service worker
  for (const app of getApps()) {
    await deleteApp(app);
  }

  const app = initializeApp(webConfig);
  const messaging = getMessaging(app);

  const registration = await navigator.serviceWorker.register(SW_URL, { scope: '/' });

  if (registration.installing) {
    await new Promise((resolve) => {
      registration.installing.addEventListener('statechange', (e) => {
        if (e.target.state === 'activated') resolve();
      });
    });
  } else {
    await navigator.serviceWorker.ready;
  }

  let token;
  try {
    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (err) {
    throw new Error(mapFirebaseError(err));
  }

  if (!token) {
    throw new Error('Could not obtain FCM token. Check Firebase Cloud Messaging is enabled for your web app.');
  }

  const saveRes = await fetch('/api/notifications/fcm-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });

  if (!saveRes.ok) {
    const data = await saveRes.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to save FCM token');
  }

  return token;
}
