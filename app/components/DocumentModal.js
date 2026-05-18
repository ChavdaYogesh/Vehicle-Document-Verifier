import { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit'
];

export default function DocumentModal({ vehicle, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    formData.append('vehicle_id', vehicle.id);
    if (file) {
      formData.set('file', file);
    }

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData, // fetch automatically sets the correct multipart/form-data boundary
      });

      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Failed to upload document');
      
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Update Document</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={24} /></button>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          For vehicle: <strong style={{ color: 'var(--text-primary)' }}>{vehicle.license_plate}</strong>
        </p>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'var(--danger-bg)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Document Type *</label>
            <select name="type" required>
              <option value="">Select Document Type...</option>
              {DOC_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Expiry Date *</label>
            <input type="date" name="expiry_date" required />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Upload Document File</label>
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--surface-hover)',
              position: 'relative'
            }}>
              <input 
                type="file" 
                onChange={(e) => setFile(e.target.files[0])}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'
                }}
              />
              <UploadCloud size={32} style={{ color: 'var(--primary)', marginBottom: '0.5rem', margin: '0 auto' }} />
              {file ? (
                <p style={{ color: 'var(--success)', fontWeight: 500 }}>{file.name}</p>
              ) : (
                <p style={{ color: 'var(--text-secondary)' }}>Click or drag file to upload</p>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
