import { useState } from 'react';
import { X, UploadCloud, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit'
];

export default function VehicleModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Controlled Inputs
  const [vehicleName, setVehicleName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [docType, setDocType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  const [file, setFile] = useState(null);
  
  // OCR State
  const [extracting, setExtracting] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    setExtracting(true);
    setError('');
    setOcrData(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/documents/extract', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setOcrData(data);
        if (data.documentType) setDocType(data.documentType);
        if (data.expiryDate) setExpiryDate(data.expiryDate);
        if (data.vehicleNumber && !licensePlate) {
          // Format back to GJ-01-AB-1234 if needed, or just set it
          setLicensePlate(data.vehicleNumber);
        }
      } else if (!res.ok) {
        console.warn('OCR Failed:', data.error);
      }
    } catch (err) {
      console.error('OCR Network Error:', err);
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const vehicleData = {
      name: vehicleName,
      license_plate: licensePlate,
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
      if (docType && expiryDate) {
        const docFormData = new FormData();
        docFormData.append('vehicle_id', vehicleId);
        docFormData.append('type', docType);
        docFormData.append('expiry_date', expiryDate);
        if (file) {
          docFormData.set('file', file);
        }
        if (ocrData) {
          docFormData.append('extractedText', ocrData.rawText || '');
          docFormData.append('extractionConfidence', ocrData.confidence || 0);
          docFormData.append('extractionStatus', 'success');
          docFormData.append('detectedDocumentType', ocrData.documentType || '');
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
          
          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Initial Document (Optional)</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Upload a document to automatically fill vehicle details using OCR.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Upload Document File</label>
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  textAlign: 'center',
                  cursor: extracting ? 'wait' : 'pointer',
                  background: extracting ? 'rgba(59, 130, 246, 0.05)' : 'var(--surface-hover)',
                  position: 'relative',
                  transition: 'var(--transition)'
                }}>
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    disabled={extracting}
                    accept="application/pdf,image/jpeg,image/png"
                    style={{
                      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: extracting ? 'wait' : 'pointer'
                    }}
                  />
                  {extracting ? (
                    <>
                      <FileSearch size={24} style={{ color: 'var(--primary)', marginBottom: '0.5rem', margin: '0 auto', animation: 'pulse 2s infinite' }} />
                      <p style={{ color: 'var(--primary)', fontWeight: 500, fontSize: '0.875rem' }}>Analyzing with OCR...</p>
                    </>
                  ) : file ? (
                    <>
                      <CheckCircle size={24} style={{ color: 'var(--success)', marginBottom: '0.5rem', margin: '0 auto' }} />
                      <p style={{ color: 'var(--success)', fontWeight: 500, fontSize: '0.875rem' }}>{file.name}</p>
                      {ocrData && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Confidence: <strong style={{ color: ocrData.confidence > 80 ? 'var(--success)' : 'var(--warning)' }}>{ocrData.confidence}%</strong>
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <UploadCloud size={24} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', margin: '0 auto' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Click or drag file to upload</p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Document Type</label>
                <select name="type" value={docType} onChange={e => setDocType(e.target.value)}>
                  <option value="">Select Document Type...</option>
                  {DOC_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Expiry Date</label>
                <input type="date" name="expiry_date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
                {ocrData && !ocrData.expiryDate && (
                  <p style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> Could not detect expiry date automatically.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>License Plate Number *</label>
            <input type="text" name="license_plate" required placeholder="e.g. GJ-01-AB-1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
            {ocrData && ocrData.vehicleNumber && (
              <p style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '0.25rem' }}>Auto-detected from document</p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Vehicle Name / Model *</label>
            <input type="text" name="name" required placeholder="e.g. Tata Prima 4018.S" value={vehicleName} onChange={e => setVehicleName(e.target.value)} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={extracting || loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || extracting}>
              {loading ? 'Adding...' : 'Add Vehicle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
