import React, { useState } from 'react';
import { X, UserPlus, ShieldCheck, UserMinus, Clock, LogOut, Image as ImageIcon } from 'lucide-react';
import type { Conversation, User, Message } from '../types';

interface GroupInfoModalProps {
  conversation: Conversation;
  currentUser: User;
  contacts: User[];
  messages: Message[];
  onClose: () => void;
  onAddMembers: (newMemberIds: number[]) => void;
  onRemoveMember: (userId: number) => void;
  onToggleAdmin: (userId: number) => void;
  onOpenDisappearingModal: () => void;
  onOpenMediaGallery: () => void;
  onLeaveGroup: () => void;
}

export const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  conversation,
  currentUser,
  contacts,
  messages,
  onClose,
  onAddMembers,
  onRemoveMember,
  onToggleAdmin,
  onOpenDisappearingModal,
  onOpenMediaGallery,
  onLeaveGroup,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [selectedToAdd, setSelectedToAdd] = useState<number[]>([]);

  // Check admin status
  const adminIds = conversation.adminIds || [conversation.members[0]?.id || currentUser.id];
  const isCurrentUserAdmin = adminIds.includes(currentUser.id);

  // Filter contacts not already in group
  const existingMemberIds = conversation.members.map((m) => m.id);
  const availableToAdd = contacts.filter((c) => !existingMemberIds.includes(c.id));

  // Count shared media & docs
  const mediaCount = messages.filter((m) => m.messageType === 'IMAGE' || m.messageType === 'VIDEO').length;
  const docCount = messages.filter((m) => m.messageType === 'FILE').length;

  const handleAddSubmit = () => {
    if (selectedToAdd.length > 0) {
      onAddMembers(selectedToAdd);
      setSelectedToAdd([]);
      setShowAddMember(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px', padding: 0, overflow: 'hidden' }}>
        {/* Banner with Group Profile */}
        <div
          style={{
            padding: '30px 20px 20px',
            background: 'linear-gradient(135deg, #3730a3 0%, var(--accent-primary) 100%)',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>

          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'var(--accent-primary)',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              color: '#fff',
              fontSize: '32px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '12px',
            }}
          >
            {conversation.title.charAt(0).toUpperCase()}
          </div>

          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{conversation.title}</h2>
          <span style={{ fontSize: '13px', opacity: 0.85, marginTop: '4px' }}>
            Group • {conversation.members.length} participants
          </span>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
          {/* Description */}
          {conversation.description && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-default)',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Group Description
              </span>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-primary)' }}>
                {conversation.description}
              </p>
            </div>
          )}

          {/* Media & Docs Shortcuts */}
          <div
            onClick={onOpenMediaGallery}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ImageIcon size={18} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Media, Links & Docs
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {mediaCount} photos/videos, {docCount} documents
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--accent-primary)', fontWeight: 600 }}>
              View all ➔
            </span>
          </div>

          {/* Disappearing Messages Setting */}
          <div
            onClick={onOpenDisappearingModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={18} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Disappearing Messages
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {conversation.disappearingTimer && conversation.disappearingTimer !== 'off'
                    ? `Active (${conversation.disappearingTimer})`
                    : 'Off'}
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Configure ➔</span>
          </div>

          {/* Participants Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Participants ({conversation.members.length})
            </span>
            {isCurrentUserAdmin && availableToAdd.length > 0 && (
              <button
                onClick={() => setShowAddMember(!showAddMember)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <UserPlus size={14} /> Add Member
              </button>
            )}
          </div>

          {/* Add Members Drawer */}
          {showAddMember && (
            <div
              style={{
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(0, 168, 132, 0.08)',
                border: '1px solid rgba(0, 168, 132, 0.3)',
                marginBottom: '14px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>
                Select contacts to add:
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {availableToAdd.map((contact) => (
                  <label
                    key={contact.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedToAdd.includes(contact.id)}
                      onChange={(e) => {
                        setSelectedToAdd(
                          e.target.checked
                            ? [...selectedToAdd, contact.id]
                            : selectedToAdd.filter((id) => id !== contact.id)
                        );
                      }}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span>{contact.displayName} (@{contact.username})</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="btn-secondary" onClick={() => setShowAddMember(false)} style={{ padding: '4px 10px', fontSize: '12px' }}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleAddSubmit}
                  disabled={selectedToAdd.length === 0}
                  style={{ padding: '4px 14px', fontSize: '12px' }}
                >
                  Add ({selectedToAdd.length})
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {conversation.members.map((member) => {
              const isAdmin = adminIds.includes(member.id);
              const isSelf = member.id === currentUser.id;

              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'var(--accent-secondary)',
                        color: '#fff',
                        fontSize: '14px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {member.displayName} {isSelf && '(You)'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        @{member.username}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isAdmin && (
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(0, 168, 132, 0.15)',
                          color: 'var(--accent-primary)',
                          border: '1px solid rgba(0, 168, 132, 0.3)',
                        }}
                      >
                        Group Admin
                      </span>
                    )}

                    {isCurrentUserAdmin && !isSelf && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => onToggleAdmin(member.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title={isAdmin ? 'Dismiss as Admin' : 'Make Group Admin'}
                        >
                          <ShieldCheck size={16} />
                        </button>
                        <button
                          onClick={() => onRemoveMember(member.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--danger)',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Remove from Group"
                        >
                          <UserMinus size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leave Group Button */}
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-default)' }}>
            <button
              onClick={onLeaveGroup}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <LogOut size={16} /> Exit Group
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
