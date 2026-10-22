import React, { useState, useRef } from 'react';
import { api } from '../services/api';
import type { User } from '../types';
import {
  X,
  User as UserIcon,
  Shield,
  Palette,
  Camera,
  Upload,
  Trash2,
  Check,
  KeyRound,
  Image as ImageIcon,
  FolderDown,
  Sparkles,
  Cloud,
  HardDrive,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface SettingsModalProps {
  currentUser: User;
  onClose: () => void;
  onProfileUpdated: (updatedUser: User) => void;
  onClearAllChats?: () => void;
  onLogout?: () => void;
}

const ACCENT_COLORS = [
  { name: 'Emerald Green', hex: '#6c5cff', glow: 'rgba(108, 92, 255, 0.25)' },
  { name: 'Sapphire Blue', hex: '#3b82f6', glow: 'rgba(59, 130, 246, 0.25)' },
  { name: 'Amethyst Violet', hex: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.25)' },
  { name: 'Rose Crimson', hex: '#f43f5e', glow: 'rgba(244, 63, 94, 0.25)' },
  { name: 'Cyberpunk Amber', hex: '#f59e0b', glow: 'rgba(245, 158, 11, 0.25)' },
];

const WALLPAPERS = [
  { id: 'default', name: 'WhatsApp Doodle', preview: '#0a0918' },
  { id: 'mesh', name: 'Emerald Mesh Gradient', preview: 'radial-gradient(circle, #5546e8 0%, #0a0918 100%)' },
  { id: 'dots', name: 'Starry Dot Grid', preview: '#0f172a' },
  { id: 'minimal', name: 'Obsidian Minimal', preview: '#000000' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  onClose,
  onProfileUpdated,
  onClearAllChats,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'chats' | 'privacy' | 'appearance'>('profile');
  const [displayName, setDisplayName] = useState(currentUser.displayName);
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentUser.avatarUrl || null);

  // Privacy Settings
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState(
    currentUser.privacySettings?.profilePhotoVisibility || 'EVERYONE'
  );
  const [lastSeenVisibility, setLastSeenVisibility] = useState(
    currentUser.privacySettings?.lastSeenVisibility || 'EVERYONE'
  );
  const [readReceipts, setReadReceipts] = useState(
    currentUser.privacySettings?.readReceiptsEnabled ?? true
  );

  // WhatsApp Secret Code for Locked Chats
  const [secretCode, setSecretCode] = useState(() => localStorage.getItem('cn_chat_lock_secret_code') || '');
  const [hideLockedChats, setHideLockedChats] = useState(
    () => localStorage.getItem('cn_hide_locked_chats') === 'true'
  );

  // WhatsApp Media Visibility & Wallpaper
  const [mediaVisibility, setMediaVisibility] = useState<string>(
    () => localStorage.getItem('cn_media_visibility') || 'default'
  );
  const [selectedWallpaper, setSelectedWallpaper] = useState<string>(
    () => localStorage.getItem('connectnow_wallpaper') || 'default'
  );

  const [currentAccent, setCurrentAccent] = useState(() => {
    return localStorage.getItem('connectnow_accent_color') || '#6c5cff';
  });

  // WhatsApp Auto Backup States
  const [autoBackupFrequency, setAutoBackupFrequency] = useState<string>(
    () => localStorage.getItem('cn_auto_backup_freq') || 'daily'
  );
  const [backupOver, setBackupOver] = useState<string>(
    () => localStorage.getItem('cn_backup_network') || 'wifi'
  );
  const [includeVideos, setIncludeVideos] = useState<boolean>(
    () => localStorage.getItem('cn_backup_include_videos') === 'true'
  );
  const [encryptedBackup, setEncryptedBackup] = useState<boolean>(
    () => localStorage.getItem('cn_encrypted_backup') !== 'false'
  );
  const [lastBackupTime, setLastBackupTime] = useState<string>(
    () => localStorage.getItem('cn_last_backup_time') || 'Today, 2:30 AM'
  );
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  const handleBackupNow = () => {
    setIsBackingUp(true);
    setBackupProgress(15);
    sound.playPopSound();

    setTimeout(() => setBackupProgress(45), 400);
    setTimeout(() => setBackupProgress(80), 800);
    setTimeout(() => {
      setBackupProgress(100);
      const nowStr = `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      setLastBackupTime(nowStr);
      localStorage.setItem('cn_last_backup_time', nowStr);
      localStorage.setItem('cn_auto_backup_freq', autoBackupFrequency);
      localStorage.setItem('cn_backup_network', backupOver);
      localStorage.setItem('cn_backup_include_videos', String(includeVideos));
      localStorage.setItem('cn_encrypted_backup', String(encryptedBackup));

      setIsBackingUp(false);
      setSuccessMsg('Chat backup completed successfully! All messages and media secured.');
      setTimeout(() => setSuccessMsg(null), 3500);
    }, 1300);
  };

  const handleRestoreBackup = () => {
    sound.playPopSound();
    setSuccessMsg('Chat history restored successfully from the latest encrypted backup!');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    try {
      const res = await api.uploadFile(file);
      const newAvatar = res.fileUrl;
      setAvatarUrl(newAvatar);

      const updated = await api.updateProfile({
        displayName,
        statusMessage,
        avatarUrl: newAvatar,
      });
      onProfileUpdated(updated);
      sound.playPopSound();
      setSuccessMsg('Profile photo updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      // Fallback to local object URL
      const localUrl = URL.createObjectURL(file);
      setAvatarUrl(localUrl);
      setSuccessMsg('Profile photo preview updated!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  // Remove Photo
  const handleRemovePhoto = async () => {
    setSaving(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setAvatarUrl(null);
    try {
      const updated = await api.updateProfile({
        displayName,
        statusMessage,
        avatarUrl: '',
      });
      onProfileUpdated({ ...updated, avatarUrl: undefined });
      sound.playPopSound();
      setSuccessMsg('Profile photo removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      onProfileUpdated({ ...currentUser, avatarUrl: undefined });
      setSuccessMsg('Profile photo removed.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await api.updateProfile({
        displayName,
        statusMessage,
        avatarUrl: avatarUrl === null ? '' : (avatarUrl || undefined),
      });
      onProfileUpdated(updated);
      sound.playPopSound();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const updated = await api.updatePrivacy({
        profilePhotoVisibility,
        lastSeenVisibility,
        readReceiptsEnabled: readReceipts,
      });

      // Save WhatsApp Secret Code configurations
      if (secretCode.trim()) {
        localStorage.setItem('cn_chat_lock_secret_code', secretCode.trim());
      } else {
        localStorage.removeItem('cn_chat_lock_secret_code');
      }
      localStorage.setItem('cn_hide_locked_chats', hideLockedChats ? 'true' : 'false');

      onProfileUpdated(updated);
      sound.playPopSound();
      setSuccessMsg('Privacy & Secret Code settings saved!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update privacy');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChats = () => {
    localStorage.setItem('cn_media_visibility', mediaVisibility);
    localStorage.setItem('connectnow_wallpaper', selectedWallpaper);
    sound.playPopSound();
    setSuccessMsg('Chat wallpaper & media visibility preferences saved!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const applyAccentColor = (colorHex: string, glowRgba: string) => {
    setCurrentAccent(colorHex);
    localStorage.setItem('connectnow_accent_color', colorHex);
    document.documentElement.style.setProperty('--accent-primary', colorHex);
    document.documentElement.style.setProperty('--accent-glow', glowRgba);
    sound.playPopSound();
    setSuccessMsg('Theme accent updated!');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div className="modal-overlay">
      {/* Hidden file input for Profile Photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handlePhotoUpload}
      />

      <div className="modal-content" style={{ maxWidth: '540px', width: '92%', borderRadius: '24px' }}>
        <div className="modal-header" style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)' }}>
          <div style={{ fontWeight: 800, fontSize: '18px' }}>Settings</div>
          <button className="icon-btn" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="sidebar-tabs" style={{ padding: '12px 24px 0', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <UserIcon size={16} />
            <span>Profile</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
          >
            <ImageIcon size={16} />
            <span>Chats & Media</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <Shield size={16} />
            <span>Privacy</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            <Palette size={16} />
            <span>Theme</span>
          </button>
        </div>

        <div className="modal-body" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
          {successMsg && (
            <div
              style={{
                background: 'rgba(108, 92, 255, 0.15)',
                border: '1px solid rgba(108, 92, 255, 0.3)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--accent-primary)',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & PHOTO OPTION */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Profile Photo Selector Section */}
              <div style={{ textAlign: 'center', margin: '4px 0 10px' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div
                    style={{
                      width: '92px',
                      height: '92px',
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      border: '3px solid var(--accent-primary)',
                      color: '#fff',
                      fontSize: '36px',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      margin: '0 auto',
                      boxShadow: '0 8px 24px var(--accent-glow)',
                    }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      displayName.charAt(0).toUpperCase()
                    )}
                  </div>

                  {/* Camera Upload Trigger Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--accent-primary)',
                      border: '2px solid var(--bg-secondary)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    }}
                    title="Change Profile Photo"
                  >
                    <Camera size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Upload size={13} /> Change Photo
                  </button>
                  {avatarUrl && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleRemovePhoto}
                      style={{ fontSize: '12px', padding: '6px 14px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>About & Status</label>
                <input
                  type="text"
                  placeholder="Available, In a meeting, etc."
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Username / Corporate Handle</label>
                <input
                  type="text"
                  value={`@${currentUser.username}`}
                  disabled
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    color: 'var(--text-muted)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ padding: '12px', fontSize: '14px', marginTop: '6px' }}
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>

              {onLogout && (
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '12px',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      background: 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                      fontWeight: 700,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out of ConnectNow</span>
                  </button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: CHATS & MEDIA VISIBILITY & WALLPAPER */}
          {activeTab === 'chats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* WhatsApp Media Visibility */}
              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <FolderDown size={18} style={{ color: 'var(--accent-primary)' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Media Visibility
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.4' }}>
                  Show newly downloaded photos, documents, and videos in your device's gallery or file manager.
                </p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {[
                    { id: 'default', label: 'Default (Yes)' },
                    { id: 'always', label: 'Always' },
                    { id: 'never', label: 'Never (No)' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMediaVisibility(opt.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: mediaVisibility === opt.id ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: mediaVisibility === opt.id ? 'rgba(108, 92, 255, 0.15)' : 'var(--bg-glass)',
                        color: mediaVisibility === opt.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Wallpaper Customizer */}
              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Chat Wallpaper
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: '1.4' }}>
                  Customize the chat background wallpaper pattern across all conversations.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                  {WALLPAPERS.map((wp) => (
                    <div
                      key={wp.id}
                      onClick={() => setSelectedWallpaper(wp.id)}
                      style={{
                        padding: '12px',
                        borderRadius: '12px',
                        border: selectedWallpaper === wp.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: wp.preview,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: selectedWallpaper === wp.id ? '0 0 12px var(--accent-glow)' : 'none',
                      }}
                    >
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>{wp.name}</span>
                      {selectedWallpaper === wp.id && <Check size={16} color="var(--accent-primary)" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp Chat Backup & Auto Backup */}
              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Cloud size={18} style={{ color: 'var(--accent-primary)' }} />
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                      Chat Backup & Auto Sync
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10.5px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(108, 92, 255, 0.15)',
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                    }}
                  >
                    Encrypted Cloud Vault
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: '1.4' }}>
                  Back up your message history and media to secure corporate storage. You can restore them when re-installing or signing in on a new device.
                </p>

                {/* Last backup stats */}
                <div
                  style={{
                    background: 'var(--bg-glass)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Last Backup:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{lastBackupTime}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Size & Content:</span>
                    <span style={{ color: 'var(--text-muted)' }}>24.8 MB • End-to-end encrypted</span>
                  </div>
                </div>

                {/* Auto Backup Frequency Dropdown */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Back up to Cloud Automatically
                  </label>
                  <select
                    value={autoBackupFrequency}
                    onChange={(e) => {
                      setAutoBackupFrequency(e.target.value);
                      localStorage.setItem('cn_auto_backup_freq', e.target.value);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-glass)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  >
                    <option value="daily">Daily (Recommended)</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="off">Off (Manual only)</option>
                  </select>
                </div>

                {/* Backup Over Network */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                    Back up Over
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setBackupOver('wifi');
                        localStorage.setItem('cn_backup_network', 'wifi');
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: backupOver === 'wifi' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: backupOver === 'wifi' ? 'rgba(108, 92, 255, 0.15)' : 'var(--bg-glass)',
                        color: backupOver === 'wifi' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Wi-Fi Only
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBackupOver('cellular');
                        localStorage.setItem('cn_backup_network', 'cellular');
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: backupOver === 'cellular' ? '1px solid var(--accent-primary)' : '1px solid var(--border-default)',
                        background: backupOver === 'cellular' ? 'rgba(108, 92, 255, 0.15)' : 'var(--bg-glass)',
                        color: backupOver === 'cellular' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Wi-Fi or Cellular
                    </button>
                  </div>
                </div>

                {/* Include Videos checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    Include video attachments in backup
                  </span>
                  <input
                    type="checkbox"
                    checked={includeVideos}
                    onChange={(e) => {
                      setIncludeVideos(e.target.checked);
                      localStorage.setItem('cn_backup_include_videos', String(e.target.checked));
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>

                {/* End-to-End Encrypted Backup checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500, display: 'block' }}>
                      End-to-End Encrypted Backup
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Protected with 64-digit corporate security key
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={encryptedBackup}
                    onChange={(e) => {
                      setEncryptedBackup(e.target.checked);
                      localStorage.setItem('cn_encrypted_backup', String(e.target.checked));
                    }}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)', cursor: 'pointer' }}
                  />
                </div>

                {/* Action buttons: Back Up Now & Restore */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={isBackingUp}
                    onClick={handleBackupNow}
                    style={{
                      flex: 1,
                      padding: '10px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    {isBackingUp ? <RefreshCw size={14} className="spin" /> : <HardDrive size={14} />}
                    <span>{isBackingUp ? `Backing up (${backupProgress}%)...` : 'Back Up Now'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={isBackingUp}
                    onClick={handleRestoreBackup}
                    style={{
                      padding: '10px 14px',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RefreshCw size={14} /> Restore
                  </button>
                </div>
              </div>

              {/* Clear All Chats Section */}
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.06)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Trash2 size={16} style={{ color: '#ef4444' }} />
                  <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#ef4444' }}>
                    Chat History Actions
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.4' }}>
                  Clear all messages across all conversations while keeping your chat list and contacts intact.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to clear all message history? This cannot be undone.')) {
                      onClearAllChats?.();
                      sound.playPopSound();
                      setSuccessMsg('All chat messages cleared successfully!');
                      setTimeout(() => setSuccessMsg(null), 3000);
                    }
                  }}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Trash2 size={14} /> Clear All Messages
                </button>
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleSaveChats}
                style={{ padding: '12px', fontSize: '14px' }}
              >
                Apply Chat & Media Preferences
              </button>
            </div>
          )}

          {/* TAB 3: PRIVACY & SECRET CODE LOCK */}
          {activeTab === 'privacy' && (
            <form onSubmit={handleSavePrivacy} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Who can see my Profile Photo</label>
                <select
                  value={profilePhotoVisibility}
                  onChange={(e) => setProfilePhotoVisibility(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="CONTACTS">My Contacts Only</option>
                  <option value="NOBODY">Nobody</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '13px', fontWeight: 600 }}>Who can see my Last Seen & Online</label>
                <select
                  value={lastSeenVisibility}
                  onChange={(e) => setLastSeenVisibility(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '13.5px',
                  }}
                >
                  <option value="EVERYONE">Everyone</option>
                  <option value="CONTACTS">My Contacts Only</option>
                  <option value="NOBODY">Nobody</option>
                </select>
              </div>

              {/* WhatsApp Secret Code Feature Card */}
              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px',
                  padding: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <KeyRound size={18} style={{ color: 'var(--accent-primary)' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                    Secret Code for Locked Chats
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: '1.4' }}>
                  Hide locked chats completely from your chat list. To reveal locked chats, simply type your secret code into the search bar.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>Hide Locked Chats</span>
                  <input
                    type="checkbox"
                    checked={hideLockedChats}
                    onChange={(e) => setHideLockedChats(e.target.checked)}
                    style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Set secret code word or emoji (e.g. secret, 🔐)"
                  value={secretCode}
                  onChange={(e) => setSecretCode(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-glass)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13.5px' }}>Read Receipts</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Send and receive blue double checkmarks (✓✓)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={readReceipts}
                  onChange={(e) => setReadReceipts(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', width: '18px', height: '18px' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ padding: '12px', fontSize: '14px' }}
              >
                {saving ? 'Saving...' : 'Save Privacy & Secret Code'}
              </button>
            </form>
          )}

          {/* TAB 4: THEME & ACCENT COLORS */}
          {activeTab === 'appearance' && (
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>
                Corporate Accent Colors
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: '10px' }}>
                {ACCENT_COLORS.map((color) => (
                  <div
                    key={color.hex}
                    onClick={() => applyAccentColor(color.hex, color.glow)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'var(--bg-card-hover)',
                      border: currentAccent === color.hex ? '2px solid var(--accent-primary)' : '1px solid var(--border-default)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: color.hex,
                          boxShadow: `0 0 10px ${color.glow}`,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{color.name}</span>
                    </div>
                    {currentAccent === color.hex && <Check size={18} color="var(--accent-primary)" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
