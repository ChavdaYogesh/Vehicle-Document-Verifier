import { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit'
];

export default function VehicleModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.target);
    const vehicleData = {
      name: formData.get('name'),
      license_plate: formData.get('license_plate'),
    };

    try {
      // 1. Create Vehicle
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vehicleData),
      });

      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Failed to add vehicle');
      
      const vehicleId = result.id;

      // 2. Add Document if provided
      const docType = formData.get('type');
      const expiryDate = formData.get('expiry_date');

      if (docType && expiryDate) {
        const docFormData = new FormData();
        docFormData.append('vehicle_id', vehicleId);
        docFormData.append('type', docType);
        docFormData.append('expiry_date', expiryDate);
        if (file) {
          docFormData.set('file', file);
        }

        const docRes = await fetch('/api/documents', {
          method: 'POST',
          body: docFormData,
        });

        const docResult = await docRes.json();
        if (!docRes.ok) throw new Error(docResult.error || 'Vehicle created, but failed to upload document');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Add New Vehicle</h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={24} /></button>
        </div>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', padding: '0.5rem', background: 'var(--danger-bg)', borderRadius: '8px' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vehicle Name / Model *</label>
            <input type="text" name="name" required placeholder="e.g. Tata Prima 4018.S" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>License Plate Number *</label>
            <input type="text" name="license_plate" required placeholder="e.g. GJ-01-AB-1234" />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Initial Document (Optional)</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Document Type</label>
                <select name="type">
                  <option value="">Select Document Type...</option>
                  {DOC_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Expiry Date</label>
                <input type="date" name="expiry_date" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Upload Document File</label>
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '1.5rem',
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
                  <UploadCloud size={24} style={{ color: 'var(--primary)', marginBottom: '0.5rem', margin: '0 auto' }} />
                  {file ? (
                    <p style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.875rem' }}>{file.name}</p>
                  ) : (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click or drag file to upload</p>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
