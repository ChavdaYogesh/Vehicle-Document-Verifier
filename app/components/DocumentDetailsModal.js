import { X, Calendar, Download, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';

export default function DocumentDetailsModal({ document, vehicleName, onClose }) {
  if (!document) return null;

  const daysLeft = differenceInDays(parseISO(document.expiry_date), new Date());
  let statusText = 'Valid';
  let statusColor = 'var(--success)';
  let StatusIcon = CheckCircle;

  if (daysLeft < 0) {
    statusText = 'Expired';
    statusColor = 'var(--danger)';
    StatusIcon = AlertTriangle;
  } else if (daysLeft <= 30) {
    statusText = `Expiring in ${daysLeft} days`;
    statusColor = 'var(--warning)';
    StatusIcon = AlertTriangle;
  }

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-fade-in" style={{ maxWidth: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-primary" /> {document.type} Details
          </h2>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>
        
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          For vehicle: <strong style={{ color: 'var(--text-primary)' }}>{vehicleName}</strong>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: statusColor, fontWeight: 600, marginTop: '0.25rem' }}>
              <StatusIcon size={16} /> {statusText}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expiry Date</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              <Calendar size={16} style={{ color: 'var(--text-secondary)' }} /> {format(parseISO(document.expiry_date), 'PPP')}
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Uploaded File</label>
            <div style={{ marginTop: '0.25rem' }}>
              {document.upload_path ? (
                <a 
                  href={document.upload_path} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', padding: '0.5rem 1rem' }}
                >
                  <Download size={16} /> View Document
                </a>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem' }}>No file uploaded</span>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
