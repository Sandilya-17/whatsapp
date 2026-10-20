import React, { useState } from 'react';
import { Clock, X, Check, Shield } from 'lucide-react';

interface DisappearingMessagesModalProps {
  currentTimer?: 'off' | '24h' | '7d' | '90d';
  onClose: () => void;
  onSetTimer: (timer: 'off' | '24h' | '7d' | '90d') => void;
}

const TIMER_OPTIONS: { id: 'off' | '24h' | '7d' | '90d'; label: string; desc: string }[] = [
  { id: '24h', label: '24 Hours', desc: 'New messages will disappear 24 hours after sending' },
  { id: '7d', label: '7 Days', desc: 'New messages will disappear 7 days after sending' },
  { id: '90d', label: '90 Days', desc: 'New messages will disappear 90 days after sending' },
  { id: 'off', label: 'Off', desc: 'Messages will remain permanently in chat history' },
];

export const DisappearingMessagesModal: React.FC<DisappearingMessagesModalProps> = ({
  currentTimer = 'off',
  onClose,
  onSetTimer,
}) => {
  const [selected, setSelected] = useState<'off' | '24h' | '7d' | '90d'>(currentTimer);

  const handleSave = () => {
    onSetTimer(selected);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
        {/* Banner */}
        <div
          style={{
            padding: '24px 20px',
            background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Disappearing Messages</h3>
              <span style={{ fontSize: '12px', opacity: 0.9 }}>WhatsApp-grade ephemeral privacy</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: 'none',
              color: '#fff',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid var(--border-default)',
              marginBottom: '16px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}
          >
            <Shield size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
            <span>
              For enhanced privacy and corporate data hygiene, all new messages sent in this chat will self-destruct after the chosen time limit.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {TIMER_OPTIONS.map((opt) => {
              const isSelected = selected === opt.id;
              return (
                <div
                  key={opt.id}
                  onClick={() => setSelected(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                    background: isSelected ? 'var(--accent-glow)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: isSelected ? 700 : 500, color: 'var(--text-primary)' }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {opt.desc}
                    </div>
                  </div>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '1px solid var(--text-muted)',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {isSelected && <Check size={13} />}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }}>
              Apply Timer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
