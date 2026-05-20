function getBrevoConfig() {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Vehicle Doc Verifier';
  if (!apiKey || !senderEmail) return null;
  return { apiKey, senderEmail, senderName };
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

export function getNotificationConfig() {
  return {
    brevoConfigured: !!getBrevoConfig(),
  };
}
