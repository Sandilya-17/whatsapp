import React from 'react';
import { Star, X, Copy } from 'lucide-react';
import type { Message } from '../types';

interface StarredMessagesModalProps {
  messages: Message[];
  onClose: () => void;
  onUnstar: (id: number) => void;
  onCopy: (content: string) => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({
  messages,
  onClose,
  onUnstar,
  onCopy,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Star size={20} style={{ fill: '#f59e0b' }} />
            </div>
            <div>
              <h2 className="modal-title">Starred Messages</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Your saved corporate notes and bookmarks ({messages.length})
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '360px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Star size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p style={{ margin: 0, fontSize: '14px' }}>No starred messages yet.</p>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>
                Star important messages by clicking the star option on any message.
              </span>
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    {m.sender.displayName}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => onCopy(m.content)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                      title="Copy text"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      onClick={() => onUnstar(m.id)}
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer' }}
                      title="Remove star"
                    >
                      <Star size={13} style={{ fill: '#f59e0b' }} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                  {m.content || m.mediaFileName || 'Attachment'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose} style={{ width: '100%' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
