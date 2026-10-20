import React, { useState } from 'react';
import { X, MapPin, Navigation, Compass, Clock, Check } from 'lucide-react';
import type { SharedLocation } from '../types';

interface ShareLocationModalProps {
  onClose: () => void;
  onSendLocation: (loc: SharedLocation) => void;
}

export const ShareLocationModal: React.FC<ShareLocationModalProps> = ({ onClose, onSendLocation }) => {
  const [isLive, setIsLive] = useState(false);
  const [liveDuration, setLiveDuration] = useState<'15m' | '1h' | '8h'>('1h');
  const [selectedPreset, setSelectedPreset] = useState(0);

  const presets = [
    {
      name: 'ConnectNow Enterprise Headquarters',
      address: '100 Silicon Vista Blvd, Tech District, CA',
      latitude: 37.7749,
      longitude: -122.4194,
    },
    {
      name: 'Innovation & Research Campus',
      address: 'Bldg 4, Cyber Port Plaza, Floor 7',
      latitude: 37.7833,
      longitude: -122.4167,
    },
    {
      name: 'Downtown Financial Center',
      address: '500 Market Street, Suite 2100',
      latitude: 37.7915,
      longitude: -122.4005,
    },
  ];

  const handleShare = () => {
    const chosen = presets[selectedPreset];
    const loc: SharedLocation = {
      latitude: chosen.latitude,
      longitude: chosen.longitude,
      name: chosen.name,
      address: chosen.address,
      isLive: isLive,
    };
    onSendLocation(loc);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: '440px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} style={{ color: '#ef4444' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '15px' }}>Share Location</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>GPS and Live Location beacon</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px' }}>
          {/* Map mockup preview */}
          <div
            style={{
              position: 'relative',
              height: '160px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              border: '1px solid var(--border-color)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            {/* Grid street lines mockup */}
            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.15 }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <line x1="0" y1="40" x2="100%" y2="40" stroke="#38bdf8" strokeWidth="2" />
              <line x1="0" y1="90" x2="100%" y2="90" stroke="#38bdf8" strokeWidth="4" />
              <line x1="0" y1="130" x2="100%" y2="130" stroke="#38bdf8" strokeWidth="2" />
              <line x1="80" y1="0" x2="80" y2="100%" stroke="#38bdf8" strokeWidth="3" />
              <line x1="220" y1="0" x2="220" y2="100%" stroke="#38bdf8" strokeWidth="4" />
              <line x1="330" y1="0" x2="330" y2="100%" stroke="#38bdf8" strokeWidth="2" />
            </svg>

            {/* Pinpoint icon with pulse */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)',
                }}
              >
                <MapPin size={22} />
              </div>
              {isLive && (
                <span
                  style={{
                    marginTop: '6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.5px',
                    background: '#ef4444',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  LIVE BEACON
                </span>
              )}
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                fontSize: '10px',
                color: 'var(--text-muted)',
                background: 'rgba(0,0,0,0.6)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              GPS ± 5m Accuracy
            </div>
          </div>

          {/* Mode switch */}
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-card-hover)',
              borderRadius: '8px',
              padding: '4px',
              marginBottom: '14px',
            }}
          >
            <button
              onClick={() => setIsLive(false)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: !isLive ? 'var(--bg-card)' : 'transparent',
                color: !isLive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: !isLive ? 600 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Navigation size={14} /> Send Current Location
            </button>
            <button
              onClick={() => setIsLive(true)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '6px',
                border: 'none',
                background: isLive ? 'var(--bg-card)' : 'transparent',
                color: isLive ? '#ef4444' : 'var(--text-muted)',
                fontWeight: isLive ? 600 : 400,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Compass size={14} /> Share Live Location
            </button>
          </div>

          {isLive && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                Share live updates for:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['15m', '1h', '8h'] as const).map((dur) => (
                  <button
                    key={dur}
                    onClick={() => setLiveDuration(dur)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      borderRadius: '6px',
                      border: liveDuration === dur ? '1px solid #ef4444' : '1px solid var(--border-color)',
                      background: liveDuration === dur ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
                      color: liveDuration === dur ? '#ef4444' : 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    <Clock size={12} /> {dur === '15m' ? '15 Minutes' : dur === '1h' ? '1 Hour' : '8 Hours'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Place selection */}
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
            Nearby Corporate Places
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
            {presets.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedPreset(idx)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: selectedPreset === idx ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  background: selectedPreset === idx ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.address}</div>
                </div>
                {selectedPreset === idx && <Check size={16} style={{ color: 'var(--accent-primary)' }} />}
              </div>
            ))}
          </div>

          <button
            className="btn-primary"
            onClick={handleShare}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <MapPin size={16} /> {isLive ? `Start Live Beacon (${liveDuration})` : 'Send Selected Location'}
          </button>
        </div>
      </div>
    </div>
  );
};
