import React, { useState } from 'react';
import { api } from '../services/api';
import type { UserSearchResult } from '../types';
import { Search, UserPlus, MessageSquare, X, Clock } from 'lucide-react';

interface ContactSearchModalProps {
  onClose: () => void;
  onSelectUserToChat: (userId: number) => void;
  onRequestSent: () => void;
}

export const ContactSearchModal: React.FC<ContactSearchModalProps> = ({
  onClose,
  onSelectUserToChat,
  onRequestSent,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.searchUsers(query.trim());
      setResults(data);
      if (data.length === 0) {
        setError('No users found matching "' + query + '"');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (targetUserId: number) => {
    try {
      await api.sendContactRequest(targetUserId);
      setResults((prev) =>
        prev.map((u) => (u.id === targetUserId ? { ...u, relationshipStatus: 'PENDING_SENT' } : u))
      );
      onRequestSent();
    } catch (err: any) {
      alert(err.message || 'Failed to send request');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Find People on ConnectNow</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSearch}>
            <div className="search-input-wrapper">
              <Search size={18} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search by username or name (e.g. alice)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button
                type="submit"
                className="form-btn-primary"
                style={{ padding: '6px 12px', fontSize: '13px' }}
                disabled={loading || !query.trim()}
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {error && (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            {results.map((user) => (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img
                    src={user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.displayName}
                    style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.displayName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{user.username}</div>
                  </div>
                </div>

                <div>
                  {user.relationshipStatus === 'CONNECTED' && (
                    <button
                      className="form-btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => {
                        onSelectUserToChat(user.id);
                        onClose();
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>Chat</span>
                    </button>
                  )}

                  {user.relationshipStatus === 'PENDING_SENT' && (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--text-muted)',
                        fontSize: '12px',
                        fontWeight: 500,
                      }}
                    >
                      <Clock size={14} />
                      <span>Request Sent</span>
                    </span>
                  )}

                  {user.relationshipStatus === 'PENDING_RECEIVED' && (
                    <span style={{ color: 'var(--accent-primary)', fontSize: '12px', fontWeight: 600 }}>
                      Pending In Requests
                    </span>
                  )}

                  {user.relationshipStatus === 'NONE' && (
                    <button
                      className="form-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={() => handleSendRequest(user.id)}
                    >
                      <UserPlus size={14} />
                      <span>Add Contact</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
