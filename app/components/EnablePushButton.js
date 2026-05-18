'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { registerForPushNotifications } from '@/lib/firebase-client';

export default function EnablePushButton({ enabled, onEnabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      await registerForPushNotifications();
      onEnabled?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (enabled) {
    return (
      <span style={{ fontSize: '0.8rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Bell size={14} /> Push enabled
      </span>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={handleEnable}
        disabled={loading}
        style={{ fontSize: '0.875rem' }}
      >
        <Bell size={16} /> {loading ? 'Enabling…' : 'Enable push alerts'}
      </button>
      {error && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', maxWidth: '220px', textAlign: 'right' }}>{error}</span>}
    </div>
  );
}
