import { X, Mail, Bell, CheckCircle, BellRing, AlertTriangle } from 'lucide-react';

function EmailStatus({ result }) {
  if (!result) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
        <Mail size={16} /> No owner email on vehicle
      </div>
    );
  }

  if (result.success && result.mode === 'brevo') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <Mail size={16} className="text-success" />
        <span style={{ color: 'var(--success)' }}>Email delivered via Brevo</span>
      </div>
    );
  }

  if (result.mode === 'unconfigured') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Mail size={16} style={{ color: 'var(--warning)' }} />
          <span style={{ color: 'var(--warning)' }}>Email not sent (Brevo not configured)</span>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{result.error}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
      <Mail size={16} style={{ color: 'var(--danger)' }} />
      <span style={{ color: 'var(--danger)' }}>Email failed: {result.error || 'Unknown error'}</span>
    </div>
  );
}

function PushStatus({ result, hasToken }) {
  if (!hasToken) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
          <Bell size={16} /> No FCM token — click &quot;Enable push alerts&quot; on the dashboard
        </div>
      </div>
    );
  }

  if (!result) return null;

  if (result.success) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
        <Bell size={16} className="text-success" />
        <span style={{ color: 'var(--success)' }}>Push notification sent (Firebase)</span>
      </div>
    );
  }

  if (result.simulated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={16} style={{ color: 'var(--warning)' }} />
          <span style={{ color: 'var(--warning)' }}>Push not sent (Firebase not configured)</span>
        </div>
        <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{result.error}</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
      <Bell size={16} style={{ color: 'var(--danger)' }} />
      <span style={{ color: 'var(--danger)' }}>Push failed: {result.error || 'Unknown error'}</span>
    </div>
  );
}

export default function AlertsModal({ results, onClose }) {
  if (!results) return null;

  const brevoOk = results.config?.brevoConfigured;
  const fcmOk = results.config?.fcmConfigured;

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '600px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BellRing size={24} className="text-primary" /> Alert Results
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{results.message}</p>
        </div>

        {(!brevoOk || !fcmOk) && (
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            <p style={{ fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={16} /> Configuration needed
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {!brevoOk && <li>Add <code>BREVO_API_KEY</code> and <code>BREVO_SENDER_EMAIL</code> for email.</li>}
              {!fcmOk && <li>Add Firebase server credentials and <code>NEXT_PUBLIC_FIREBASE_*</code> for push.</li>}
            </ul>
          </div>
        )}

        {results.alertsSent && results.alertsSent.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
            {results.alertsSent.map((alert, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{alert.vehicle} - {alert.type}</strong>
                  <span className={`badge ${alert.status === 'Expired' ? 'badge-danger' : 'badge-warning'}`}>
                    {alert.status}
                  </span>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  {alert.message}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <EmailStatus result={alert.emailResult} />
                  <PushStatus result={alert.pushResult} hasToken={alert.hasFcmToken} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
            <CheckCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No alerts needed at this time. All documents are valid for more than 30 days.</p>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
