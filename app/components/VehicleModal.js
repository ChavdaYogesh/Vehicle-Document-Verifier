import { useState } from 'react';
import { X, UploadCloud, FileSearch, CheckCircle, AlertCircle } from 'lucide-react';

const DOC_TYPES = [
  'Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit', 'Tax'
];

export default function VehicleModal({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Controlled Inputs
  const [vehicleName, setVehicleName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [docType, setDocType] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [expiryType, setExpiryType] = useState('DIRECT');
  
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
        if (data.vehicleNumber && !licensePlate) {
          // Format back to GJ-01-AB-1234 if needed, or just set it
          setLicensePlate(data.vehicleNumber);
        }
      } else if (res.ok && !data.success) {
        setOcrData({ confidence: 0, failed: true, message: data.message });
      } else if (!res.ok) {
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
      if (docType && (expiryDate || expiryType !== 'DIRECT')) {
        const docFormData = new FormData();
        docFormData.append('vehicle_id', vehicleId);
        docFormData.append('type', docType);
        if (expiryDate) docFormData.append('expiry_date', expiryDate);
        docFormData.append('expiryType', expiryType);
        
        if (file) {
          docFormData.set('file', file);
        }
        if (ocrData && !ocrData.failed) {
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
                      {ocrData && !ocrData.failed && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Confidence: <strong style={{ color: ocrData.confidence > 80 ? 'var(--success)' : 'var(--warning)' }}>{ocrData.confidence}%</strong>
                        </span>
                      )}
                      {ocrData && ocrData.failed && (
                        <div style={{ marginTop: '0.25rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                           <span style={{ color: 'var(--warning)' }}><AlertCircle size={12} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> {ocrData.message} Try JPG/PNG.</span>
                        </div>
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
                <input 
                  type={expiryType === 'DIRECT' ? 'date' : 'text'} 
                  name="expiry_date" 
                  value={expiryType === 'DIRECT' ? expiryDate : 'Calculated Automatically'} 
                  onChange={e => setExpiryDate(e.target.value)} 
                  disabled={expiryType !== 'DIRECT'}
                  style={expiryType !== 'DIRECT' ? { background: 'var(--surface-hover)', color: 'var(--text-secondary)', fontStyle: 'italic' } : {}}
                />
                {expiryType === 'FITNESS_LINKED' && (
                   <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--warning)', borderRadius: '6px' }}>
                     <p style={{ color: 'var(--warning)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
                       <AlertCircle size={16} /> Fitness Certificate Needed
                     </p>
                     <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                       This document's validity depends on a Fitness Certificate. Please upload the Fitness Certificate next to ensure accurate tracking.
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
                    <AlertCircle size={12} /> Could not detect expiry date automatically.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>License Plate Number *</label>
            <input type="text" name="license_plate" required placeholder="e.g. GJ-01-AB-1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value)} />
            {ocrData && !ocrData.failed && ocrData.vehicleNumber && (
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
