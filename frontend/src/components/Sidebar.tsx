import React, { useState, useRef, useEffect } from 'react';
import type { User, Conversation, ContactRequest, CallRecord, Message, StatusStory } from '../types';
import { getStoredStories, subscribeToStatusUpdates, startStatusSync } from '../utils/statusStorage';
import { readDraft } from '../utils/chatUi';
import {
  getStoredCallRecords,
  deleteCallRecord,
  clearAllCallRecords,
  subscribeToCallLogUpdates,
} from '../utils/callLogStorage';
import {
  MessageSquare,
  Phone,
  Video,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  Users,
  UserPlus,
  User as UserIcon,
  Settings,
  LogOut,
  Search,
  Check,
  X,
  PlusCircle,
  Pin,
  Sun,
  Moon,
  FolderPlus,
  Star,
  Archive,
  VolumeX,
  Volume2,
  MoreVertical,
  CheckCheck,
  Lock,
  Unlock,
  Monitor,
  Link,
  Plus,
  Copy,
  Download,
  Smartphone,
  Trash2,
} from 'lucide-react';
import { ChatLockModal } from './ChatLockModal';
import { api } from '../services/api';

interface SidebarProps {
  currentUser: User;
  conversations: Conversation[];
  contacts: User[];
  pendingRequests: ContactRequest[];
  activeConversationId: number | null;
  onSelectConversation: (conv: Conversation) => void;
  onOpenDirectChatWithContact: (contact: User) => void;
  onAcceptRequest: (requestId: number) => void;
  onRejectRequest: (requestId: number) => void;
  onOpenSearchModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenCreateGroupModal: () => void;
  onOpenStarredModal: () => void;
  onOpenStoriesModal: () => void;
  onOpenLinkedDevicesModal?: () => void;
  onOpenDownloadAppsModal?: () => void;
  onToggleMobilePreview?: () => void;
  isMobilePreviewActive?: boolean;
  onToggleTheme: () => void;
  isDarkTheme: boolean;
  onLogout: () => void;
  isMobileHidden?: boolean;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onInitiateCall?: (type: 'audio' | 'video', peerUser: User) => void;
  starredMessages?: Message[];
  onUnstarMessage?: (id: number) => void;
  onDeleteConversation?: (convId: number) => void;
  onClearConversation?: (convId: number) => void;
  onDeleteContact?: (contactId: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  conversations,
  contacts,
  pendingRequests,
  activeConversationId,
  onSelectConversation,
  onOpenDirectChatWithContact,
  onAcceptRequest,
  onRejectRequest,
  onOpenSearchModal,
  onOpenSettingsModal,
  onOpenCreateGroupModal,
  onOpenStarredModal,
  onOpenStoriesModal,
  onOpenLinkedDevicesModal,
  onOpenDownloadAppsModal,
  onToggleMobilePreview,
  isMobilePreviewActive = false,
  onToggleTheme,
  isDarkTheme,
  onLogout,
  isMobileHidden,
  onNotify,
  onInitiateCall,
  starredMessages = [],
  onUnstarMessage,
  onDeleteConversation,
  onClearConversation,
  onDeleteContact,
}) => {
  // WhatsApp primary tab navigation
  const [activeTab, setActiveTab] = useState<'chats' | 'status' | 'calls' | 'contacts' | 'starred' | 'archived'>('chats');
  const [filterType, setFilterType] = useState<'all' | 'direct' | 'group' | 'unread'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [showLockedOnly, setShowLockedOnly] = useState(false);

  // Persistent lists for WhatsApp chat states
  const [pinnedConvIds, setPinnedConvIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cn_pinned_conv_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [archivedConvIds, setArchivedConvIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cn_archived_conv_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [mutedConvIds, setMutedConvIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cn_muted_conv_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [markedUnreadConvIds, setMarkedUnreadConvIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cn_marked_unread_conv_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [lockedConvIds, setLockedConvIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('cn_locked_conv_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [lockModalTarget, setLockModalTarget] = useState<{ conv: Conversation; mode: 'toggle' | 'unlock' } | null>(null);
  const [openMenuConvId, setOpenMenuConvId] = useState<number | null>(null);

  // WhatsApp Call History Log state
  const [callRecords, setCallRecords] = useState<CallRecord[]>(() => getStoredCallRecords());

  useEffect(() => {
    const unsub = subscribeToCallLogUpdates((records) => {
      setCallRecords(records);
    });
    return unsub;
  }, []);

  // Real uploaded stories state (synced with localStorage & statusStorage)
  const [stories, setStories] = useState<StatusStory[]>(() => getStoredStories());

  useEffect(() => {
    const unsub = subscribeToStatusUpdates(() => {
      setStories(getStoredStories());
    });
    const stopSync = startStatusSync();
    return () => {
      unsub();
      stopSync();
    };
  }, []);

  const myLatestStory = stories.find((s) => s.user?.id === currentUser?.id);
  const otherStories = stories.filter((s) => s.user?.id !== currentUser?.id);

  // Avatar popover menu state
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false);
      }
    };
    if (showAvatarMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvatarMenu]);

  const handleDeleteCallRecord = (callId: string) => {
    deleteCallRecord(callId);
    onNotify?.('Call record removed', 'info');
  };

  const handleClearAllCalls = () => {
    if (callRecords.length === 0) return;
    clearAllCallRecords();
    onNotify?.('Call history cleared', 'info');
  };

  // WhatsApp Secret Code states
  const secretCode = localStorage.getItem('cn_chat_lock_secret_code');
  const hideLocked = localStorage.getItem('cn_hide_locked_chats') === 'true';
  const isSecretCodeEntered = Boolean(secretCode && searchFilter.trim() === secretCode.trim());

  const togglePinConv = (convId: number) => {
    setPinnedConvIds((prev) => {
      const next = prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId];
      try {
        localStorage.setItem('cn_pinned_conv_ids', JSON.stringify(next));
      } catch {}
      onNotify?.(next.includes(convId) ? 'Chat pinned to top' : 'Chat unpinned', 'info');
      return next;
    });
    setOpenMenuConvId(null);
  };

  const toggleArchiveConv = (convId: number) => {
    setArchivedConvIds((prev) => {
      const next = prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId];
      try {
        localStorage.setItem('cn_archived_conv_ids', JSON.stringify(next));
      } catch {}
      onNotify?.(next.includes(convId) ? 'Chat archived' : 'Chat unarchived', 'info');
      return next;
    });
    setOpenMenuConvId(null);
  };

  const toggleMuteConv = (convId: number) => {
    const next = mutedConvIds.includes(convId) ? mutedConvIds.filter((id) => id !== convId) : [...mutedConvIds, convId];
    setMutedConvIds(next);
    try {
      localStorage.setItem('cn_muted_conv_ids', JSON.stringify(next));
    } catch {}
    // tell the server too, so push notifications for this chat are silenced as well
    api.setConversationMuted(convId, next.includes(convId)).catch(() => {});
    onNotify?.(next.includes(convId) ? 'Notifications muted' : 'Notifications unmuted', 'info');
    setOpenMenuConvId(null);
  };

  const toggleMarkUnread = (convId: number) => {
    setMarkedUnreadConvIds((prev) => {
      const next = prev.includes(convId) ? prev.filter((id) => id !== convId) : [...prev, convId];
      try {
        localStorage.setItem('cn_marked_unread_conv_ids', JSON.stringify(next));
      } catch {}
      onNotify?.(next.includes(convId) ? 'Marked as unread' : 'Marked as read', 'info');
      return next;
    });
    setOpenMenuConvId(null);
  };

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  const missedCallsCount = callRecords.filter((c) => c.direction === 'missed').length;

  const filteredConversations = conversations
    .filter((c) => {
      const isLocked = lockedConvIds.includes(c.id);
      const isArchived = archivedConvIds.includes(c.id);

      if (activeTab === 'archived') {
        return isArchived;
      }

      if (isSecretCodeEntered) {
        return isLocked;
      }

      if (showLockedOnly) {
        return isLocked;
      }

      // Hide locked chats from normal view unless vault is open or revealed via secret code
      if (isLocked && !isVaultUnlocked) {
        return false;
      }

      // Hide archived from main list
      if (isArchived) return false;

      const matchesSearch = c.title.toLowerCase().includes(searchFilter.toLowerCase());
      if (!matchesSearch) return false;
      if (filterType === 'direct') return c.type === 'DIRECT';
      if (filterType === 'group') return c.type === 'GROUP';
      if (filterType === 'unread') return c.unreadCount > 0 || markedUnreadConvIds.includes(c.id);
      return true;
    })
    .sort((a, b) => {
      const aPinned = pinnedConvIds.includes(a.id);
      const bPinned = pinnedConvIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return 0;
    });

  const filteredContacts = (contacts || []).filter(
    (u) =>
      (u?.displayName || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (u?.username || '').toLowerCase().includes(searchFilter.toLowerCase())
  );

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopyCallLink = () => {
    const link = `https://connectnow.internal/meet/${Math.random().toString(36).substring(2, 10)}`;
    navigator.clipboard.writeText(link);
    onNotify?.('Meeting call link copied to clipboard!', 'success');
  };

  return (
    <aside className={`sidebar ${isMobileHidden ? 'hidden' : ''}`}>
      {/* 1. WhatsApp Vertical Left Navigation Rail */}
      <nav className="nav-rail">
        <div className="rail-top-group">
          {/* Chats */}
          <button
            className={`rail-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('chats');
              setShowLockedOnly(false);
            }}
            title="Chats"
          >
            <MessageSquare size={22} />
            {totalUnreadCount > 0 && <span className="rail-badge">{totalUnreadCount}</span>}
          </button>

          {/* Status (WhatsApp Stories) */}
          <button
            className={`rail-btn ${activeTab === 'status' ? 'active' : ''}`}
            onClick={() => setActiveTab('status')}
            title="Status"
          >
            <Camera size={22} />
            <span
              style={{
                position: 'absolute',
                top: '7px',
                right: '7px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--status-online)',
                border: '1.5px solid var(--bg-surface)',
              }}
            />
          </button>

          {/* Calls */}
          <button
            className={`rail-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={() => setActiveTab('calls')}
            title="Calls"
          >
            <Phone size={22} />
            {missedCallsCount > 0 && <span className="rail-badge danger">{missedCallsCount}</span>}
          </button>

          {/* Contacts & Requests */}
          <button
            className={`rail-btn ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
            title="Contacts & Directory"
          >
            <Users size={22} />
            {pendingRequests.length > 0 && <span className="rail-badge">{pendingRequests.length}</span>}
          </button>

          {/* Settings button on mobile bottom bar */}
          <button
            className="rail-btn mobile-only-rail"
            onClick={onOpenSettingsModal}
            title="Settings & Profile"
          >
            <Settings size={22} />
          </button>

          {/* Starred Notes (Desktop) */}
          <button
            className={`rail-btn desktop-only-rail ${activeTab === 'starred' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('starred');
              if (onOpenStarredModal) onOpenStarredModal();
            }}
            title="Starred Messages"
          >
            <Star size={22} />
          </button>

          {/* Archived Chats (Desktop) */}
          <button
            className={`rail-btn desktop-only-rail ${activeTab === 'archived' ? 'active' : ''}`}
            onClick={() => setActiveTab('archived')}
            title="Archived Chats"
          >
            <Archive size={22} />
            {archivedConvIds.length > 0 && <span className="rail-badge">{archivedConvIds.length}</span>}
          </button>

          {/* Quick Logout Button (Desktop) */}
          <button
            className="rail-btn desktop-only-rail"
            onClick={onLogout}
            title="Log out"
            style={{ color: '#ef4444' }}
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="rail-bottom-group">
          {/* Linked Devices */}
          {onOpenLinkedDevicesModal && (
            <button
              className="rail-btn"
              onClick={onOpenLinkedDevicesModal}
              title="Linked devices"
            >
              <Monitor size={20} />
            </button>
          )}

          {/* Theme Switcher */}
          <button
            className="rail-btn"
            onClick={onToggleTheme}
            title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkTheme ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Settings */}
          <button className="rail-btn" onClick={onOpenSettingsModal} title="Settings">
            <Settings size={20} />
          </button>

          {/* Current User Avatar with Popover */}
          <div ref={avatarMenuRef} style={{ position: 'relative' }}>
            <div
              className="rail-avatar-btn"
              onClick={() => setShowAvatarMenu(!showAvatarMenu)}
              title={`${currentUser?.displayName || currentUser?.username || 'You'} (@${currentUser?.username || 'user'}) - Click for options`}
            >
              {currentUser?.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser?.displayName || 'User'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    fontSize: '15px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {(currentUser?.displayName || currentUser?.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <span className="status-dot online" style={{ width: '10px', height: '10px', borderWidth: '2px' }} />
            </div>

            {showAvatarMenu && (
              <div
                className="whatsapp-dropdown-menu"
                style={{
                  position: 'absolute',
                  bottom: '0',
                  left: '52px',
                  minWidth: '255px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-xl)',
                  padding: '8px',
                  zIndex: 100,
                  backdropFilter: 'blur(16px)',
                }}
              >
                {/* Profile Card Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px 12px',
                    borderBottom: '1px solid var(--border-subtle)',
                    marginBottom: '6px',
                  }}
                >
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      flexShrink: 0,
                      overflow: 'hidden',
                    }}
                  >
                    {currentUser?.avatarUrl ? (
                      <img src={currentUser.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (currentUser?.displayName || currentUser?.username || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {currentUser?.displayName || currentUser?.username || 'You'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      @{currentUser?.username || 'user'} • <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Active</span>
                    </div>
                  </div>
                </div>

                {/* Profile & Settings */}
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowAvatarMenu(false);
                    onOpenSettingsModal();
                  }}
                >
                  <UserIcon size={16} />
                  <span>Profile & Settings</span>
                </button>

                {/* Linked Devices */}
                {onOpenLinkedDevicesModal && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowAvatarMenu(false);
                      onOpenLinkedDevicesModal();
                    }}
                  >
                    <Monitor size={16} />
                    <span>Linked devices</span>
                  </button>
                )}

                {/* Download Desktop & Mobile Apps */}
                {onOpenDownloadAppsModal && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowAvatarMenu(false);
                      onOpenDownloadAppsModal();
                    }}
                  >
                    <Download size={16} style={{ color: '#6c5cff' }} />
                    <span>Download Apps (Mac, Win, iOS)</span>
                  </button>
                )}

                {/* Mobile App Preview */}
                {onToggleMobilePreview && (
                  <button
                    className="menu-item"
                    onClick={() => {
                      setShowAvatarMenu(false);
                      onToggleMobilePreview();
                    }}
                  >
                    <Smartphone size={16} />
                    <span>{isMobilePreviewActive ? 'Switch to Desktop View' : 'Preview Mobile View'}</span>
                  </button>
                )}

                {/* Theme Switcher */}
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowAvatarMenu(false);
                    onToggleTheme();
                  }}
                >
                  {isDarkTheme ? <Sun size={16} /> : <Moon size={16} />}
                  <span>Switch to {isDarkTheme ? 'Light' : 'Dark'} Mode</span>
                </button>

                <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 0' }} />

                {/* Log Out */}
                <button
                  className="menu-item danger"
                  onClick={() => {
                    setShowAvatarMenu(false);
                    onLogout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 2. Main Sidebar Content Panel */}
      <div className="sidebar-panel">
        {/* TAB: CHATS */}
        {activeTab === 'chats' && (
          <>
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Chats</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="icon-btn"
                  onClick={onOpenCreateGroupModal}
                  title="New Team Group"
                >
                  <FolderPlus size={19} />
                </button>
                <button
                  className="icon-btn"
                  onClick={onOpenSearchModal}
                  title="New Direct Message"
                >
                  <PlusCircle size={19} />
                </button>
                <button
                  className="icon-btn"
                  onClick={onLogout}
                  title="Log out"
                  style={{ color: '#ef4444' }}
                >
                  <LogOut size={19} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="sidebar-search-box">
              <div className="search-input-wrapper">
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search messages, teams, colleagues..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', padding: '0 16px 8px', overflowX: 'auto' }}>
              {(['all', 'unread', 'direct', 'group'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: filterType === type ? 'var(--accent-primary)' : 'var(--border-default)',
                    background: filterType === type ? 'rgba(108, 92, 255, 0.15)' : 'var(--bg-glass)',
                    color: filterType === type ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    textTransform: 'capitalize',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s',
                  }}
                >
                  {type === 'all' ? 'All' : type === 'unread' ? 'Unread' : type === 'direct' ? 'Direct' : 'Groups'}
                </button>
              ))}
            </div>

            {/* Locked Chats Folder Banner (Hidden if WhatsApp Secret Code is active, unless code is typed in search) */}
            {lockedConvIds.length > 0 && (!hideLocked || isSecretCodeEntered || isVaultUnlocked || showLockedOnly) && (
              <div
                onClick={() => {
                  if (isVaultUnlocked) {
                    setShowLockedOnly(!showLockedOnly);
                  } else {
                    setLockModalTarget({ conv: { id: 0, title: 'Locked Chats Vault' } as any, mode: 'unlock' });
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-default)',
                  background: showLockedOnly ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isVaultUnlocked ? (
                    <Unlock size={18} style={{ color: 'var(--accent-primary)' }} />
                  ) : (
                    <Lock size={18} style={{ color: 'var(--accent-primary)' }} />
                  )}
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {showLockedOnly ? 'Showing Locked Chats' : isVaultUnlocked ? 'Locked Chats (Unlocked)' : 'Locked Chats'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {isVaultUnlocked && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsVaultUnlocked(false);
                        setShowLockedOnly(false);
                        onNotify?.('Vault locked securely', 'info');
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        padding: '2px 6px',
                      }}
                    >
                      Lock
                    </button>
                  )}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {lockedConvIds.length}
                  </span>
                </div>
              </div>
            )}

            {/* Archived Chats Folder Banner */}
            {archivedConvIds.length > 0 && (
              <div
                onClick={() => setActiveTab('archived')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border-default)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Archive size={18} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Archived Chats
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {archivedConvIds.length}
                </span>
              </div>
            )}

            {/* Conversations List */}
            <div className="conversation-list" style={{ flex: 1, overflowY: 'auto' }}>
              {filteredConversations.length === 0 ? (
                <div className="sidebar-empty">
                  <MessageSquare size={36} />
                  <p>No conversations found.</p>
                  <button
                    className="form-btn-secondary"
                    onClick={onOpenSearchModal}
                    style={{ fontSize: '13px' }}
                  >
                    Find Colleagues
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isOnline = conv.otherParticipant?.online;
                  const isPinned = pinnedConvIds.includes(conv.id);
                  const isMuted = mutedConvIds.includes(conv.id);
                  const isArchived = archivedConvIds.includes(conv.id);
                  const isMarkedUnread = markedUnreadConvIds.includes(conv.id);

                  return (
                    <div
                      key={conv.id}
                      className={`conv-item ${activeConversationId === conv.id ? 'active' : ''}`}
                      onClick={() => {
                        if (isMarkedUnread) {
                          setMarkedUnreadConvIds((prev) => prev.filter((id) => id !== conv.id));
                        }
                        onSelectConversation(conv);
                      }}
                      style={{ position: 'relative' }}
                    >
                      <div className="avatar-wrapper">
                        <div
                          className="avatar"
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: conv.type === 'GROUP' ? '#6366f1' : 'var(--accent-secondary)',
                            color: '#fff',
                            fontSize: '16px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {conv.title.charAt(0).toUpperCase()}
                        </div>
                        {conv.type === 'DIRECT' && (
                          <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                        )}
                      </div>

                      <div className="conv-details">
                        <div className="conv-top-row">
                          <span className="conv-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{conv.title}</span>
                            {isPinned && <Pin size={12} style={{ color: 'var(--accent-primary)' }} />}
                            {isMuted && <VolumeX size={12} style={{ color: 'var(--text-muted)' }} />}
                          </span>
                          <span className="conv-time">{formatTime(conv.lastMessageAt)}</span>
                        </div>
                        <div className="conv-bottom-row">
                          <span className="conv-preview" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {/* Drafts show first, as in WhatsApp. Ticks are not shown here because the
                                list payload does not say who sent the last message, so they would be wrong. */}
                            {(() => {
                              const draft = readDraft(conv.id);
                              return draft ? (
                                <span className="conv-draft" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  <span className="conv-draft-label">Draft: </span>
                                  {draft.replace(/\s+/g, ' ')}
                                </span>
                              ) : (
                                <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                  {conv.lastMessagePreview || 'Started conversation'}
                                </span>
                              );
                            })()}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {(conv.unreadCount > 0 || isMarkedUnread) && (
                              <span className="unread-badge">
                                {conv.unreadCount > 0 ? conv.unreadCount : '•'}
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuConvId(openMenuConvId === conv.id ? null : conv.id);
                              }}
                              className="icon-btn"
                              style={{ width: '24px', height: '24px', padding: 0 }}
                            >
                              <MoreVertical size={14} />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Menu */}
                      {openMenuConvId === conv.id && (
                        <div
                          className="message-actions-menu"
                          style={{
                            position: 'absolute',
                            right: '16px',
                            top: '40px',
                            zIndex: 200,
                            width: '180px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                          onMouseLeave={() => setOpenMenuConvId(null)}
                        >
                          <button className="menu-item" onClick={() => togglePinConv(conv.id)}>
                            <Pin size={14} />
                            <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
                          </button>
                          <button className="menu-item" onClick={() => toggleMuteConv(conv.id)}>
                            {isMuted ? <Volume2 size={14} /> : <VolumeX size={14} />}
                            <span>{isMuted ? 'Unmute' : 'Mute notifications'}</span>
                          </button>
                          <button className="menu-item" onClick={() => toggleArchiveConv(conv.id)}>
                            <Archive size={14} />
                            <span>{isArchived ? 'Unarchive chat' : 'Archive chat'}</span>
                          </button>
                          <button className="menu-item" onClick={() => toggleMarkUnread(conv.id)}>
                            <CheckCheck size={14} />
                            <span>{isMarkedUnread ? 'Mark as read' : 'Mark as unread'}</span>
                          </button>
                          <button
                            className="menu-item"
                            onClick={() => {
                              setLockModalTarget({ conv, mode: 'toggle' });
                              setOpenMenuConvId(null);
                            }}
                          >
                            {lockedConvIds.includes(conv.id) ? <Unlock size={14} /> : <Lock size={14} />}
                            <span>{lockedConvIds.includes(conv.id) ? 'Unlock chat' : 'Lock chat'}</span>
                          </button>

                          {onClearConversation && (
                            <button
                              className="menu-item"
                              onClick={() => {
                                if (window.confirm(`Clear all messages in "${conv.title}"? The conversation will remain.`)) {
                                  onClearConversation(conv.id);
                                  setOpenMenuConvId(null);
                                }
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Clear messages</span>
                            </button>
                          )}

                          {onDeleteConversation && (
                            <button
                              className="menu-item danger"
                              onClick={() => {
                                if (window.confirm(`Delete conversation "${conv.title}"? All chat history will be removed.`)) {
                                  onDeleteConversation(conv.id);
                                  setOpenMenuConvId(null);
                                }
                              }}
                              style={{ color: '#ef4444' }}
                            >
                              <Trash2 size={14} />
                              <span>Delete chat</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {/* TAB: STATUS (WhatsApp Stories) */}
        {activeTab === 'status' && (
          <div className="sidebar-tab-content">
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Status</span>
              <button
                className="icon-btn"
                onClick={onOpenStoriesModal}
                title="Post New Status"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="sidebar-scrollable-content">
              {/* My Status */}
              <div
                className="status-row-item"
                onClick={onOpenStoriesModal}
                style={{ background: 'var(--bg-glass)', border: '1px solid var(--border-subtle)', marginBottom: '16px', cursor: 'pointer' }}
              >
                <div className={`status-avatar-ring my-status ${myLatestStory ? '' : ''}`}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '18px',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {myLatestStory?.mediaUrl ? (
                      <img src={myLatestStory.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      (currentUser?.displayName || currentUser?.username || '?').charAt(0).toUpperCase()
                    )}
                    {!myLatestStory && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-2px',
                          right: '-2px',
                          background: 'var(--accent-primary)',
                          color: '#fff',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          border: '2px solid var(--bg-secondary)',
                        }}
                      >
                        +
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                    My Status
                  </div>
                  <div style={{ fontSize: '12px', color: myLatestStory ? 'var(--accent-primary)' : 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {myLatestStory ? `${myLatestStory.content || '📷 Photo Status'} • ${myLatestStory.createdAt}` : 'Tap to add status or announcement'}
                  </div>
                </div>
              </div>

              {/* Recent Updates Header */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '14px 6px 10px' }}>
                Recent Updates ({otherStories.length})
              </div>

              {otherStories.length === 0 ? (
                <div className="sidebar-empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <Camera size={34} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <h4 style={{ margin: '0 0 6px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>No Status Updates</h4>
                  <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    No status updates uploaded yet. Tap "My Status" or "+" to post an update.
                  </p>
                </div>
              ) : (
                otherStories.map((story) => (
                  <div
                    key={story.id}
                    className="status-row-item"
                    onClick={onOpenStoriesModal}
                  >
                    <div className="status-avatar-ring">
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          background: 'var(--bg-tertiary)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '16px',
                          overflow: 'hidden',
                        }}
                      >
                        {story.mediaUrl ? (
                          <img src={story.mediaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          (story.user?.displayName || story.user?.username || '?').charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {story.user?.displayName || story.user?.username || 'Colleague'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {story.content || (story.mediaUrl ? '📷 Photo' : '')} • {story.createdAt}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: CALLS (WhatsApp Call Log) */}
        {activeTab === 'calls' && (
          <div className="sidebar-tab-content">
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Calls</span>
              <button
                className="icon-btn"
                onClick={onOpenSearchModal}
                title="Start New Call"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="sidebar-scrollable-content">
              {/* Create Call Link Banner */}
              <div
                className="call-log-item"
                onClick={handleCopyCallLink}
                style={{
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '16px',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(108, 92, 255, 0.15)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Link size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      Create call link
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Share a link for your ConnectNow video meeting
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Calls Log */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 6px 10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recent Calls
                </span>
                {callRecords.length > 0 && (
                  <button
                    onClick={handleClearAllCalls}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Trash2 size={12} /> Clear all
                  </button>
                )}
              </div>

              {callRecords.length === 0 ? (
                <div className="sidebar-empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(108, 92, 255, 0.1)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Phone size={26} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    No call logs yet
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '240px', margin: '0 auto 16px', lineHeight: '1.4' }}>
                    End-to-end encrypted voice and video calls with your colleagues will appear here.
                  </p>
                  <button
                    className="btn-primary"
                    onClick={onOpenSearchModal}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '8px 16px' }}
                  >
                    <Plus size={15} /> Start a New Call
                  </button>
                </div>
              ) : (
                callRecords.map((call) => (
                  <div key={call.id} className="call-log-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          background: 'var(--bg-tertiary)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '15px',
                        }}
                      >
                        {(call.peerUser?.displayName || call.peerUser?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {call.peerUser?.displayName || call.peerUser?.username || 'Colleague'}
                        </div>
                        <div className={`call-direction-badge ${call.direction}`} style={{ marginTop: '2px' }}>
                          {call.direction === 'outgoing' ? (
                            <ArrowUpRight size={14} />
                          ) : (
                            <ArrowDownLeft size={14} />
                          )}
                          <span>
                            {call.timestamp} {call.duration && `(${call.duration})`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        className="icon-btn"
                        onClick={() => handleDeleteCallRecord(call.id)}
                        style={{ color: 'var(--text-muted)' }}
                        title="Delete call entry"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => onInitiateCall && onInitiateCall(call.type, call.peerUser)}
                        style={{ color: 'var(--accent-primary)' }}
                        title={`Call ${call.peerUser.displayName}`}
                      >
                        {call.type === 'video' ? <Video size={18} /> : <Phone size={18} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB: CONTACTS & REQUESTS */}
        {activeTab === 'contacts' && (
          <div className="sidebar-tab-content">
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Contacts & Requests</span>
              <button
                className="icon-btn"
                onClick={onOpenSearchModal}
                title="Search Directory"
              >
                <UserPlus size={19} />
              </button>
            </div>

            <div className="sidebar-search-box">
              <div className="search-input-wrapper">
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter colleagues..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
            </div>

            <div className="sidebar-scrollable-content" style={{ padding: '0 0 20px' }}>
              {/* PENDING RECEIVED REQUESTS */}
              {pendingRequests.length > 0 && (
                <div style={{ padding: '12px 16px 8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                      Pending Requests ({pendingRequests.length})
                    </span>
                    <span style={{ fontSize: '11px', background: 'rgba(108, 92, 255, 0.15)', color: 'var(--accent-primary)', padding: '2px 8px', borderRadius: '10px', fontWeight: 700 }}>
                      Action required
                    </span>
                  </div>
                  {pendingRequests.map((req) => (
                    <div
                      key={req.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        background: 'var(--bg-glass)',
                        border: '1px solid rgba(108, 92, 255, 0.35)',
                        borderRadius: '12px',
                        marginBottom: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'var(--accent-secondary)',
                            color: '#fff',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '15px',
                            flexShrink: 0,
                          }}
                        >
                          {(req.sender?.displayName || req.sender?.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.sender?.displayName || req.sender?.username || 'Colleague'}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                            @{req.sender?.username || 'user'}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                        <button
                          onClick={() => onAcceptRequest(req.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(108, 92, 255, 0.3)',
                          }}
                          title="Accept Contact Request"
                        >
                          <Check size={14} strokeWidth={3} /> Accept
                        </button>
                        <button
                          onClick={() => onRejectRequest(req.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Decline Contact Request"
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DIRECTORY SECTION */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '8px 16px' }}>
                Colleagues Directory ({filteredContacts.length})
              </div>

              {filteredContacts.length === 0 && pendingRequests.length === 0 && (
                <div className="sidebar-empty" style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Users size={44} style={{ color: 'var(--accent-primary)', marginBottom: '14px' }} />
                  <h4 style={{ margin: '0 0 8px', fontSize: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>
                    No Colleagues Connected
                  </h4>
                  <p style={{ margin: '0 0 18px', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Search colleagues across your organization to chat, send voice messages, and start HD calls.
                  </p>
                  <button
                    className="form-btn-primary"
                    onClick={onOpenSearchModal}
                    style={{ fontSize: '13px', padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <UserPlus size={16} /> Find Colleagues
                  </button>
                </div>
              )}

              {filteredContacts.length === 0 && pendingRequests.length > 0 && (
                <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Accept incoming requests above to connect and start messaging.
                </div>
              )}

              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="conv-item"
                  onClick={() => onOpenDirectChatWithContact(contact)}
                >
                  <div className="avatar-wrapper">
                    <div
                      className="avatar"
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        background: 'var(--accent-secondary)',
                        color: '#fff',
                        fontSize: '15px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {(contact.displayName || contact.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className={`status-dot ${contact.online ? 'online' : 'offline'}`} />
                  </div>
                  <div className="conv-details">
                    <div className="conv-top-row">
                      <span className="conv-name">{contact.displayName || contact.username}</span>
                    </div>
                    <div className="conv-bottom-row">
                      <span className="conv-preview">@{contact.username}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {onDeleteContact && (
                      <button
                        className="icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Remove contact @${contact.username} (${contact.displayName || contact.username})?`)) {
                            onDeleteContact(contact.id);
                          }
                        }}
                        style={{ color: '#ef4444' }}
                        title="Remove Contact"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInitiateCall && onInitiateCall('audio', contact);
                      }}
                      title="Audio Call"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onInitiateCall && onInitiateCall('video', contact);
                      }}
                      title="Video Call"
                    >
                      <Video size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: STARRED NOTES */}
        {activeTab === 'starred' && (
          <div className="sidebar-tab-content">
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Starred Messages</span>
            </div>
            <div className="sidebar-scrollable-content" style={{ padding: '16px' }}>
              {starredMessages.length === 0 ? (
                <div className="sidebar-empty">
                  <Star size={36} />
                  <p>No starred messages yet. Bookmark key announcements and files in any conversation.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {starredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '12px',
                        background: 'var(--bg-glass)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '10px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--accent-primary)' }}>
                          {msg.sender?.displayName || msg.sender?.username || 'Colleague'}
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            className="icon-btn"
                            style={{ width: '22px', height: '22px', padding: 0 }}
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              onNotify?.('Copied text to clipboard', 'success');
                            }}
                            title="Copy"
                          >
                            <Copy size={13} />
                          </button>
                          {onUnstarMessage && (
                            <button
                              className="icon-btn"
                              style={{ width: '22px', height: '22px', padding: 0, color: '#f59e0b' }}
                              onClick={() => onUnstarMessage(msg.id)}
                              title="Unstar"
                            >
                              <Star size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{msg.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: ARCHIVED CHATS */}
        {activeTab === 'archived' && (
          <div className="sidebar-tab-content">
            <div className="sidebar-top-bar">
              <span className="sidebar-title">Archived Chats</span>
              <button
                className="form-btn-secondary"
                onClick={() => setActiveTab('chats')}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Back to Chats
              </button>
            </div>
            <div className="sidebar-scrollable-content">
              {filteredConversations.length === 0 ? (
                <div className="sidebar-empty">
                  <Archive size={36} />
                  <p>No archived conversations.</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="conv-item"
                    onClick={() => onSelectConversation(conv)}
                  >
                    <div className="avatar-wrapper">
                      <div
                        className="avatar"
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          background: 'var(--accent-secondary)',
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {conv.title.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="conv-details">
                      <div className="conv-top-row">
                        <span className="conv-name">{conv.title}</span>
                      </div>
                      <div className="conv-bottom-row">
                        <span className="conv-preview">{conv.lastMessagePreview || 'Archived'}</span>
                      </div>
                    </div>
                    <button
                      className="form-btn-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArchiveConv(conv.id);
                        onNotify?.('Chat unarchived', 'info');
                      }}
                      style={{ fontSize: '11px', padding: '4px 8px' }}
                    >
                      Unarchive
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Chat Lock & Vault Modal */}
      {lockModalTarget && (
        <ChatLockModal
          chatTitle={lockModalTarget.conv.title}
          isCurrentlyLocked={lockedConvIds.includes(lockModalTarget.conv.id)}
          mode={lockModalTarget.mode}
          onClose={() => setLockModalTarget(null)}
          onSuccess={() => {
            if (lockModalTarget.mode === 'unlock') {
              setIsVaultUnlocked(true);
              setShowLockedOnly(true);
              onNotify?.('Vault unlocked: Viewing locked chats', 'success');
            } else {
              const isNowLocked = lockedConvIds.includes(lockModalTarget.conv.id);
              if (isNowLocked) {
                setLockedConvIds((prev) => prev.filter((id) => id !== lockModalTarget.conv.id));
              } else {
                setLockedConvIds((prev) => [...prev, lockModalTarget.conv.id]);
              }
            }
          }}
          onNotify={onNotify}
        />
      )}
    </aside>
  );
};
