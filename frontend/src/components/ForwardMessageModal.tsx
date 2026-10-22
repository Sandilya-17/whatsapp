import React, { useState } from 'react';
import { Forward, X, Search, Check } from 'lucide-react';
import type { Conversation, Message } from '../types';

interface ForwardMessageModalProps {
  message: Message;
  conversations: Conversation[];
  onClose: () => void;
  onForward: (targetConvId: number, msg: Message) => void;
}

export const ForwardMessageModal: React.FC<ForwardMessageModalProps> = ({
  message,
  conversations,
  onClose,
  onForward,
}) => {
  const [search, setSearch] = useState('');
  const [selectedConvId, setSelectedConvId] = useState<number | null>(null);

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedConvId) {
      onForward(selectedConvId, message);
      onClose();
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Forward size={20} />
            </div>
            <div>
              <h2 className="modal-title">Forward Message</h2>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                Share with a colleague or channel
              </p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Message preview snippet */}
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(255, 255, 255, 0.04)',
            borderLeft: '3px solid var(--accent-primary)',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            maxHeight: '70px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <span style={{ fontWeight: 600, display: 'block', color: 'var(--text-primary)', fontSize: '11px' }}>
            {message.sender.displayName}
          </span>
          {message.content || message.mediaFileName || 'Attachment'}
        </div>

        {/* Search */}
        <div className="search-input-wrapper" style={{ marginBottom: '12px' }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            className="search-input"
            placeholder="Search destination chat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List of chats */}
        <div
          style={{
            maxHeight: '220px',
            overflowY: 'auto',
            border: '1px solid var(--border-default)',
            borderRadius: '8px',
            padding: '4px',
            marginBottom: '18px',
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No chats found.
            </div>
          ) : (
            filtered.map((conv) => {
              const isSelected = selectedConvId === conv.id;
              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(108, 92, 255, 0.12)' : 'transparent',
                    border: isSelected ? '1px solid rgba(108, 92, 255, 0.3)' : '1px solid transparent',
                    marginBottom: '4px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      className="avatar"
                      style={{
                        width: '32px',
                        height: '32px',
                        fontSize: '13px',
                        borderRadius: '50%',
                        background: conv.type === 'GROUP' ? '#6366f1' : 'var(--accent-secondary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                      }}
                    >
                      {conv.title.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {conv.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {conv.type === 'GROUP' ? 'Group channel' : 'Direct message'}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      border: isSelected ? 'none' : '1px solid var(--text-muted)',
                      background: isSelected ? 'var(--accent-primary)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                    }}
                  >
                    {isSelected && <Check size={12} />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!selectedConvId}
            onClick={handleConfirm}
            style={{ flex: 2 }}
          >
            Forward Message
          </button>
        </div>
      </div>
    </div>
  );
};
