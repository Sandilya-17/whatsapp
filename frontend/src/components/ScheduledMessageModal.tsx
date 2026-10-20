import React, { useState } from 'react';
import { Calendar, Clock, X, Send } from 'lucide-react';

interface ScheduledMessageModalProps {
  onClose: () => void;
  onSchedule: (content: string, scheduledTime: Date) => void;
}

export const ScheduledMessageModal: React.FC<ScheduledMessageModalProps> = ({
  onClose,
  onSchedule,
}) => {
  const [content, setContent] = useState('');
  const [preset, setPreset] = useState<'30m' | '1h' | 'tomorrow' | 'custom'>('1h');
  const [customDate, setCustomDate] = useState('');

  const calculateTargetDate = (): Date => {
    const now = new Date();
    if (preset === '30m') {
      return new Date(now.getTime() + 30 * 60 * 1000);
    } else if (preset === '1h') {
      return new Date(now.getTime() + 60 * 60 * 1000);
    } else if (preset === 'tomorrow') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      return tomorrow;
    } else if (customDate) {
      return new Date(customDate);
    }
    return new Date(now.getTime() + 60 * 60 * 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const targetDate = calculateTargetDate();
    onSchedule(content.trim(), targetDate);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="modal-title">Schedule Message</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Dispatch message at a scheduled date & time
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Message Content *</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="e.g. Friendly reminder: Q3 sprint review starts in 15 minutes."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Delivery Schedule</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setPreset('30m')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: preset === '30m' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: preset === '30m' ? 'var(--accent-glow)' : 'transparent',
                  color: preset === '30m' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                }}
              >
                <Clock size={13} /> In 30 Minutes
              </button>

              <button
                type="button"
                onClick={() => setPreset('1h')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: preset === '1h' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: preset === '1h' ? 'var(--accent-glow)' : 'transparent',
                  color: preset === '1h' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                }}
              >
                <Clock size={13} /> In 1 Hour
              </button>

              <button
                type="button"
                onClick={() => setPreset('tomorrow')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: preset === 'tomorrow' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: preset === 'tomorrow' ? 'var(--accent-glow)' : 'transparent',
                  color: preset === 'tomorrow' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={13} /> Tomorrow 9:00 AM
              </button>

              <button
                type="button"
                onClick={() => setPreset('custom')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: preset === 'custom' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                  background: preset === 'custom' ? 'var(--accent-glow)' : 'transparent',
                  color: preset === 'custom' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  justifyContent: 'center',
                }}
              >
                <Calendar size={13} /> Custom Time
              </button>
            </div>

            {preset === 'custom' && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: '12px',
              color: '#93c5fd',
              marginBottom: '18px',
            }}
          >
            Scheduled for: <strong>{calculateTargetDate().toLocaleString()}</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Send size={15} /> Schedule Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
