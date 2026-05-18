let firebaseAdmin;

function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Vehicle Doc Verifier';
  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName };
}

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

async function getFirebaseMessaging() {
  const config = getFirebaseConfig();
  if (!config) return null;

  if (!firebaseAdmin) {
    const admin = (await import('firebase-admin')).default;
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.projectId,
          clientEmail: config.clientEmail,
          privateKey: config.privateKey,
        }),
      });
    }
    firebaseAdmin = admin;
  }

  return firebaseAdmin.messaging();
}

export async function sendEmail(to, subject, text) {
  const brevo = getBrevoConfig();
  if (!brevo) {
    return {
      success: false,
      mode: 'unconfigured',
      error: 'Brevo not configured — set BREVO_API_KEY and BREVO_SENDER_EMAIL in .env.local',
    };
  }

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': brevo.apiKey,
      },
      body: JSON.stringify({
        sender: { name: brevo.senderName, email: brevo.senderEmail },
        to: [{ email: to }],
        subject,
        textContent: text,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data.message || data.code || res.statusText;
      return { success: false, mode: 'brevo', error: message };
    }

    return { success: true, mode: 'brevo', messageId: data.messageId };
  } catch (err) {
    console.error('Failed to send email via Brevo:', err);
    return { success: false, mode: 'brevo', error: err.message || 'Email send failed' };
  }
}

export async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken?.trim()) {
    return { success: false, error: 'Invalid FCM device token' };
  }

  const messaging = await getFirebaseMessaging();
  if (!messaging) {
    return {
      success: false,
      simulated: true,
      error:
        'FCM not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local',
    };
  }

  try {
    const messageId = await messaging.send({
      token: fcmToken.trim(),
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
    });
    return { success: true, messageId };
  } catch (err) {
    console.error('Failed to send FCM push:', err);
    const code = err.code || err.errorInfo?.code;
    return {
      success: false,
      error: err.message || 'Push notification failed',
      code,
    };
  }
}

export function getNotificationConfig() {
  return {
    brevoConfigured: !!getBrevoConfig(),
    fcmConfigured: !!getFirebaseConfig(),
  };
}
