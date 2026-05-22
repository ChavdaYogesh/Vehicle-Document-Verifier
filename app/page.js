"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, BellRing, Car, FileText, AlertTriangle, CheckCircle, Clock, LogOut, User, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import VehicleModal from '@/app/components/VehicleModal';
import DocumentModal from '@/app/components/DocumentModal';
import DocumentDetailsModal from '@/app/components/DocumentDetailsModal';
import AlertsModal from '@/app/components/AlertsModal';
import { differenceInDays, parseISO } from 'date-fns';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewingVehicleName, setViewingVehicleName] = useState('');
  const [expandedVehicleId, setExpandedVehicleId] = useState(null);
  const [alertResults, setAlertResults] = useState(null);
  const [processingAlerts, setProcessingAlerts] = useState(false);
  const [hideBanner, setHideBanner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setUser(data.user);
        fetchVehicles();
      } catch (err) {
        router.push('/login');
      }
    };
    checkAuth();
  }, []);

  const fetchVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      const vehiclesWithDocs = await Promise.all(data.map(async (v) => {
        try {
          const docRes = await fetch(`/api/vehicles/${v.id}`);
          if (!docRes.ok) return { ...v, documents: [] };
          const docData = await docRes.json();
          return { ...v, ...docData }; 
        } catch (e) {
          return { ...v, documents: [] };
        }
      }));
      
      setVehicles(vehiclesWithDocs);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Failed to logout:', err);
    }
  };

  const triggerAlerts = async () => {
    setProcessingAlerts(true);
    try {
      const res = await fetch('/api/cron/check-alerts');
      const data = await res.json();
      setAlertResults(data);
    } catch (error) {
      console.error('Failed to trigger alerts:', error);
    } finally {
      setProcessingAlerts(false);
    }
  };

  const getAlertMessages = () => {
    const alerts = [];
    const today = new Date();
    vehicles.forEach(vehicle => {
      vehicle.documents?.forEach(doc => {
        if (doc.dependencyStatus === 'INVALID_DEPENDENCY' || doc.dependencyStatus === 'EXPIRED') {
          alerts.push({ vehicle: vehicle.name, plate: vehicle.license_plate, type: doc.type, status: 'Expired', days: -1 });
        } else if (doc.dependencyStatus === 'EXPIRING_SOON' && doc.expiry_date) {
          const daysLeft = differenceInDays(parseISO(doc.expiry_date), today);
          alerts.push({ vehicle: vehicle.name, plate: vehicle.license_plate, type: doc.type, status: 'Expiring Soon', days: daysLeft });
        } else if (!doc.dependencyStatus && doc.expiry_date) {
          const daysLeft = differenceInDays(parseISO(doc.expiry_date), today);
          if (daysLeft < 0) {
            alerts.push({ vehicle: vehicle.name, plate: vehicle.license_plate, type: doc.type, status: 'Expired', days: daysLeft });
          } else if (daysLeft <= 30) {
            alerts.push({ vehicle: vehicle.name, plate: vehicle.license_plate, type: doc.type, status: 'Expiring Soon', days: daysLeft });
          }
        }
      });
    });
    return alerts;
  };

  const toggleVehicle = (id) => {
    setExpandedVehicleId(prev => prev === id ? null : id);
  };

  const getDocumentStatus = (doc) => {
    if (!doc) return 'missing';
    if (doc.dependencyStatus) {
      if (doc.dependencyStatus === 'INVALID_DEPENDENCY' || doc.dependencyStatus === 'EXPIRED') return 'expired';
      if (doc.dependencyStatus === 'EXPIRING_SOON') return 'expiring_soon';
      if (doc.dependencyStatus === 'NO_EXPIRY_FOUND') return 'missing';
      if (doc.dependencyStatus === 'ACTIVE') return 'valid';
    }
    
    if (!doc.expiry_date) return 'missing';
    const daysLeft = differenceInDays(parseISO(doc.expiry_date), new Date());
    if (daysLeft < 0) return 'expired';
    if (daysLeft <= 30) return 'expiring_soon';
    return 'valid';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'valid': return <span className="badge badge-success"><CheckCircle size={14} style={{marginRight: 4}}/> Valid</span>;
      case 'expired': return <span className="badge badge-danger"><AlertTriangle size={14} style={{marginRight: 4}}/> Expired</span>;
      case 'expiring_soon': return <span className="badge badge-warning"><Clock size={14} style={{marginRight: 4}}/> Soon</span>;
      default: return <span className="badge" style={{background: '#334155'}}><FileText size={14} style={{marginRight: 4}}/> Missing</span>;
    }
  };

  if (!user) {
    return <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <>
      <div className="animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-title">
            Vehicle Document Verifier
          </h1>
          <p style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={16} /> Welcome back, {user.name}
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={triggerAlerts} disabled={processingAlerts}>
            <BellRing size={18} /> {processingAlerts ? 'Sending...' : 'Send Alerts'}
          </button>
          <button className="btn btn-primary" onClick={() => setShowVehicleModal(true)}>
            <Plus size={18} /> Add Vehicle
          </button>
          <button className="btn btn-secondary" onClick={handleLogout} style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)' }} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {!loading && vehicles.length > 0 && !hideBanner && (() => {
        const alerts = getAlertMessages();
        if (alerts.length === 0) return null;
        return (
          <div className="animate-fade-in" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
            <h2 style={{ color: 'var(--danger)', fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertTriangle size={20} /> Action Required: {alerts.length} Document(s) Expiring
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {alerts.map((a, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>{a.vehicle} ({a.plate})</strong> - <span style={{ color: 'var(--text-secondary)' }}>{a.type}</span>
                  </div>
                  <span style={{ color: a.days < 0 ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, fontSize: '0.875rem' }}>
                    {a.days < 0 ? 'Expired' : `Expiring in ${a.days} days`}
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setHideBanner(true)} style={{ background: 'var(--surface-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                OK, Dismiss
              </button>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>Loading fleet data...</div>
      ) : vehicles.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <Car size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} />
          <h2>No Vehicles Found</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Add your first vehicle to start tracking documents.</p>
          <button className="btn btn-primary" onClick={() => setShowVehicleModal(true)}>
            <Plus size={18} /> Add Vehicle
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {vehicles.map(vehicle => {
            const isExpanded = expandedVehicleId === vehicle.id;
            
            return (
              <div key={vehicle.id} className="glass-panel" style={{ padding: '1.5rem', transition: 'var(--transition)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '1rem' : '0' }}>
                  <div 
                    onClick={() => toggleVehicle(vehicle.id)}
                    style={{ cursor: 'pointer', flex: 1 }}
                  >
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Car size={20} className="text-primary" /> {vehicle.name}
                      {isExpanded ? <ChevronUp size={20} style={{ color: 'var(--text-secondary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--text-secondary)' }} />}
                    </h3>
                    <div style={{ display: 'inline-block', background: '#fbbf24', color: '#000', padding: '0.1rem 0.5rem', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                      {vehicle.license_plate}
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.5rem', marginLeft: '1rem' }}
                    onClick={(e) => { e.stopPropagation(); setSelectedVehicle(vehicle); setShowDocModal(true); }}
                    title="Upload Document"
                  >
                    <Plus size={16} /> Doc
                  </button>
                </div>
                
                {isExpanded && (
                  <div className="animate-fade-in" style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {['Insurance', 'PUC', 'Fitness', 'RC', 'Calibration', '9 number', 'Gujarat Permit', 'National Permit', 'Tax'].map(docType => {
                      const doc = vehicle.documents?.find(d => d.type === docType);
                      const status = getDocumentStatus(doc);
                      const hasDoc = !!doc;
                      
                      return (
                        <div 
                          key={docType} 
                          onClick={() => {
                            if (hasDoc) {
                              setViewingDoc(doc);
                              setViewingVehicleName(`${vehicle.name} (${vehicle.license_plate})`);
                            }
                          }}
                          style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '0.5rem', 
                            borderBottom: '1px solid var(--border)',
                            cursor: hasDoc ? 'pointer' : 'default',
                            borderRadius: '4px',
                            background: hasDoc ? 'transparent' : 'none',
                            transition: 'background 0.2s ease',
                          }}
                          onMouseEnter={(e) => {
                            if (hasDoc) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            if (hasDoc) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.875rem', color: hasDoc ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                              {docType}
                            </span>
                            {hasDoc && <Eye size={14} style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />}
                          </div>
                          {getStatusBadge(status)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {showVehicleModal && (
        <VehicleModal 
          onClose={() => setShowVehicleModal(false)} 
          onSuccess={() => { setShowVehicleModal(false); fetchVehicles(); }} 
        />
      )}
      
      {showDocModal && selectedVehicle && (
        <DocumentModal 
          vehicle={selectedVehicle}
          onClose={() => setShowDocModal(false)} 
          onSuccess={() => { setShowDocModal(false); fetchVehicles(); }} 
        />
      )}

      {viewingDoc && (
        <DocumentDetailsModal 
          document={viewingDoc} 
          vehicleName={viewingVehicleName}
          onClose={() => setViewingDoc(null)} 
        />
      )}

      {alertResults && (
        <AlertsModal 
          results={alertResults} 
          onClose={() => setAlertResults(null)} 
        />
      )}
    </>
  );
}
