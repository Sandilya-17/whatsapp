import React, { useEffect } from 'react';
import type { CallSignal } from '../types';
import { Phone, PhoneOff, Video, Shield } from 'lucide-react';
import { sound } from '../utils/sound';

interface IncomingCallModalProps {
  signal: CallSignal;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  signal,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    sound.playRingtone();
    return () => {
      sound.stopRingtone();
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 99998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Encrypted Call Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#10b981',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '20px',
            background: 'rgba(16, 185, 129, 0.1)',
            padding: '4px 12px',
            borderRadius: '16px',
          }}
        >
          <Shield size={14} /> End-to-End Encrypted WebRTC Call
        </div>

        {/* Pulsing Avatar */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              fontWeight: 800,
              color: '#fff',
              boxShadow: '0 0 40px rgba(59, 130, 246, 0.5)',
            }}
          >
            {(signal.callerName || signal.callerUsername || 'U').charAt(0).toUpperCase()}
          </div>
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '50%',
              border: '2px solid rgba(59, 130, 246, 0.4)',
              animation: 'pulse 1.4s infinite',
            }}
          />
        </div>

        <h3 style={{ color: '#f8fafc', fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0' }}>
          {signal.callerName || signal.callerUsername}
        </h3>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: '#94a3b8',
            fontSize: '14px',
            marginBottom: '32px',
          }}
        >
          {signal.callType === 'video' ? <Video size={16} /> : <Phone size={16} />}
          <span>Incoming {signal.callType === 'video' ? 'Video' : 'Voice'} Call...</span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          {/* Decline */}
          <button
            onClick={() => {
              sound.stopRingtone();
              onDecline();
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#dc2626',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(220, 38, 38, 0.4)',
              }}
            >
              <PhoneOff size={26} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Decline</span>
          </button>

          {/* Accept */}
          <button
            onClick={() => {
              sound.stopRingtone();
              onAccept();
            }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: '#16a34a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 20px rgba(22, 163, 74, 0.4)',
                animation: 'pulse 1.2s infinite',
              }}
            >
              {signal.callType === 'video' ? <Video size={26} /> : <Phone size={26} />}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
