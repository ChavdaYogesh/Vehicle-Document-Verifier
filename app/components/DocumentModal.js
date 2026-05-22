import { useState, useRef } from 'react';
import { X, UploadCloud, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit', 'Tax'
];

export default function DocumentModal({ vehicle, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  
  // Controlled inputs for OCR pre-filling
  const [docType, setDocType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryType, setExpiryType] = useState('DIRECT');
  
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
    setExpiryType('DIRECT'); // Reset

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
        if (data.expiryType) setExpiryType(data.expiryType);
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
    if (expiryDate) formData.append('expiry_date', expiryDate);
    formData.append('expiryType', expiryType);
    
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

  const hasFitness = vehicle.documents?.some(d => d.type === 'Fitness');
  const showFitnessWarning = expiryType === 'FITNESS_LINKED' && !hasFitness;

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Expiry Date {expiryType === 'DIRECT' && '*'}</label>
            <input 
              type={expiryType === 'DIRECT' ? 'date' : 'text'} 
              name="expiry_date" 
              required={expiryType === 'DIRECT'} 
              value={expiryType === 'DIRECT' ? expiryDate : 'Calculated Automatically'} 
              onChange={e => setExpiryDate(e.target.value)} 
              disabled={expiryType !== 'DIRECT'}
              style={expiryType !== 'DIRECT' ? { background: 'var(--surface-hover)', color: 'var(--text-secondary)', fontStyle: 'italic' } : {}}
            />
            {expiryType === 'FITNESS_LINKED' && (
               <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                 <AlertCircle size={12} /> Expiry linked to Fitness Certificate.
               </p>
            )}
            {showFitnessWarning && (
              <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '6px' }}>
                <p style={{ color: 'var(--warning)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                  <AlertCircle size={16} /> Fitness Certificate Missing
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                  This document's validity depends on your Fitness Certificate. Please ensure you upload the Fitness Certificate for accurate tracking.
                </p>
              </div>
            )}
            {expiryType === 'MULTI_DOCUMENT_DEPENDENT' && (
               <p style={{ color: 'var(--primary)', fontSize: '0.75rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                 <AlertCircle size={12} /> Expiry depends on multiple other documents (Fitness, Insurance, Tax).
               </p>
            )}
            {ocrData && !ocrData.failed && !ocrData.expiryDate && expiryType === 'DIRECT' && (
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
