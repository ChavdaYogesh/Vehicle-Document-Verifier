import { useState, useRef } from 'react';
import { X, UploadCloud, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit'
];

export default function DocumentModal({ vehicle, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  
  // Controlled inputs for OCR pre-filling
  const [docType, setDocType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  
  // OCR State
  const [extracting, setExtracting] = useState(false);
  const [ocrData, setOcrData] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Attempt OCR Extraction
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
      } else if (res.ok && !data.success) {
        setOcrData({ confidence: 0, failed: true, message: data.message });
      } else if (!res.ok) {
        // We don't block upload if OCR fails, just show a minor warning or nothing
        console.warn('OCR Failed:', data.error);
        setOcrData({ confidence: 0, failed: true, message: 'Server error during analysis.' });
      }
    } catch (err) {
      console.error('OCR Network Error:', err);
      setOcrData({ confidence: 0, failed: true, message: 'Network error during analysis.' });
    } finally {
      setExtracting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('vehicle_id', vehicle.id);
    formData.append('type', docType);
    formData.append('expiry_date', expiryDate);
    
    if (file) {
      formData.set('file', file);
    }

    if (ocrData && !ocrData.failed) {
      formData.append('extractedText', ocrData.rawText || '');
      formData.append('extractionConfidence', ocrData.confidence || 0);
      formData.append('extractionStatus', 'success');
      formData.append('detectedDocumentType', ocrData.documentType || '');
    }

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
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
          
          {/* File Upload at the top to encourage OCR first */}
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Upload Document File (PDF, JPG, PNG)</label>
            <div style={{
              border: '2px dashed var(--border)',
              borderRadius: '8px',
              padding: '2rem',
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
                  <FileSearch size={32} style={{ color: 'var(--primary)', marginBottom: '0.5rem', margin: '0 auto', animation: 'pulse 2s infinite' }} />
                  <p style={{ color: 'var(--primary)', fontWeight: 500 }}>Analyzing document with OCR...</p>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>This may take a few moments</p>
                </>
              ) : file ? (
                <>
                  <CheckCircle size={32} style={{ color: 'var(--success)', marginBottom: '0.5rem', margin: '0 auto' }} />
                  <p style={{ color: 'var(--success)', fontWeight: 500 }}>{file.name}</p>
                  {ocrData && !ocrData.failed && (
                     <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>OCR Confidence: <strong style={{ color: ocrData.confidence > 80 ? 'var(--success)' : 'var(--warning)' }}>{ocrData.confidence}%</strong></span>
                     </div>
                  )}
                  {ocrData && ocrData.failed && (
                     <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1rem', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--warning)' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {ocrData.message} Try JPG/PNG.</span>
                     </div>
                  )}
                </>
              ) : (
                <>
                  <UploadCloud size={32} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem', margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-secondary)' }}>Click or drag file to upload and auto-fill</p>
                </>
              )}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Document Type *</label>
            <select name="type" required value={docType} onChange={e => setDocType(e.target.value)}>
              <option value="">Select Document Type...</option>
              {DOC_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Expiry Date *</label>
            <input type="date" name="expiry_date" required value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
            {ocrData && !ocrData.failed && !ocrData.expiryDate && (
               <p style={{ color: 'var(--warning)', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                 <AlertCircle size={12} /> Could not detect expiry date automatically. Please enter it manually.
               </p>
            )}
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={extracting || loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || extracting}>
              {loading ? 'Saving...' : 'Save Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
