import React from 'react';
import type { User } from '../types';
import { X, Mail, Shield, Phone, Video, Ban, CheckCircle2, MessageSquare, Clock } from 'lucide-react';

interface UserProfileModalProps {
  user: User;
  isBlocked?: boolean;
  onClose: () => void;
  onStartChat?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  onToggleBlock?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isBlocked,
  onClose,
  onStartChat,
  onAudioCall,
  onVideoCall,
  onToggleBlock,
}) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px', padding: 0, overflow: 'hidden' }}>
        {/* Banner with gradient */}
        <div
          style={{
            height: '110px',
            background: 'var(--accent-gradient)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '14px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: 'none',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Avatar & Header */}
        <div style={{ padding: '0 24px 24px', position: 'relative' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              border: '4px solid var(--bg-secondary)',
              background: 'var(--accent-secondary)',
              color: '#fff',
              fontSize: '32px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '-40px',
              boxShadow: 'var(--shadow-md)',
              position: 'relative',
            }}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              user.displayName.charAt(0).toUpperCase()
            )}
            <div
              style={{
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: user.online ? 'var(--status-online)' : 'var(--status-offline)',
                border: '3px solid var(--bg-secondary)',
              }}
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {user.displayName}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>@{user.username}</span>
              <span
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: user.online ? 'rgba(108, 92, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: user.online ? 'var(--status-online)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {user.online ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '18px',
              paddingBottom: '18px',
              borderBottom: '1px solid var(--border-default)',
            }}
          >
            {onStartChat && (
              <button
                className="btn-primary"
                onClick={onStartChat}
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <MessageSquare size={16} /> Chat
              </button>
            )}
            {onAudioCall && (
              <button
                className="btn-secondary"
                onClick={onAudioCall}
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Phone size={16} /> Audio
              </button>
            )}
            {onVideoCall && (
              <button
                className="btn-secondary"
                onClick={onVideoCall}
                style={{ flex: 1, padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Video size={16} /> Video
              </button>
            )}
          </div>

          {/* Details list */}
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {user.statusMessage && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <Clock size={18} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status / Bio
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {user.statusMessage}
                  </div>
                </div>
              </div>
            )}

            {user.email && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <Mail size={18} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Corporate Email
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {user.email}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Shield size={18} style={{ color: 'var(--accent-primary)', marginTop: '2px', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Encryption & Security
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  End-to-End Enterprise WebSocket Encrypted
                </div>
              </div>
            </div>
          </div>

          {/* Block button if requested */}
          {onToggleBlock && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
              <button
                onClick={onToggleBlock}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  background: isBlocked ? 'rgba(108, 92, 255, 0.1)' : 'var(--danger-bg)',
                  border: isBlocked ? '1px solid var(--accent-primary)' : '1px solid rgba(239, 68, 68, 0.3)',
                  color: isBlocked ? 'var(--accent-primary)' : 'var(--danger)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isBlocked ? (
                  <>
                    <CheckCircle2 size={16} /> Unblock User
                  </>
                ) : (
                  <>
                    <Ban size={16} /> Block Contact
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
