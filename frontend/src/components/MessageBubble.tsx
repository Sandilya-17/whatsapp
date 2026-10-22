import React, { useState, useRef } from 'react';
import type { Message, User } from '../types';
import { API_ORIGIN } from '../services/api';
import {
  Check,
  CheckCheck,
  Clock,
  MoreVertical,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Star,
  Pin,
  FileText,
  Download,
  Play,
  Pause,
  Smile,
  Forward,
  BarChart2,
  CheckCircle,
  MapPin,
  ExternalLink,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  currentUser: User;
  isGroup?: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDeleteForMe: (messageId: number) => void;
  onDeleteForEveryone: (messageId: number) => void;
  onToggleStar?: (messageId: number) => void;
  onTogglePin?: (messageId: number) => void;
  onReact?: (messageId: number, emoji: string) => void;
  onForward?: (message: Message) => void;
  onVotePoll?: (messageId: number, optionId: string) => void;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

const resolveMediaUrl = (url?: string): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  currentUser,
  isGroup = false,
  onReply,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  onToggleStar,
  onTogglePin,
  onReact,
  onForward,
  onVotePoll,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioSpeed, setAudioSpeed] = useState<1 | 1.5 | 2>(1);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const isSent = Boolean(
    currentUser && (
      message.sender?.id === currentUser.id ||
      String(message.sender?.id) === String(currentUser.id) ||
      (currentUser.username && message.sender?.username && currentUser.username.toLowerCase() === message.sender.username.toLowerCase())
    )
  );

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Simple rich text formatting parser: *bold*, _italic_, `code`
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // Split text into tokens for bold, italic, code
    const parts = text.split(/(`[^`]+`|\*[^*]+\*|_[^_]+_)/g);
    return parts.map((part, index) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index}>{part.slice(1, -1)}</strong>;
      }
      if (part.startsWith('_') && part.endsWith('_')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div
      className={`message-row ${isSent ? 'sent' : 'received'}`}
      style={{
        position: 'relative',
        margin: '4px 0',
        alignSelf: isSent ? 'flex-end' : 'flex-start',
        marginLeft: isSent ? 'auto' : undefined,
        marginRight: !isSent ? 'auto' : undefined,
      }}
    >
      <div
        className={`message-bubble ${message.deletedForEveryone ? 'deleted' : ''}`}
        style={{
          position: 'relative',
          border: message.isPinned ? '1px solid var(--accent-primary)' : undefined,
          minWidth: message.poll ? '260px' : undefined,
        }}
      >
        {/* Forwarded Header */}
        {message.isForwarded && !message.deletedForEveryone && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: isSent ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
              marginBottom: '4px',
              fontStyle: 'italic',
            }}
          >
            <Forward size={12} /> Forwarded
          </div>
        )}

        {/* Pinned Indicator badge */}
        {message.isPinned && !message.deletedForEveryone && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              color: isSent ? '#e2e8f0' : 'var(--accent-primary)',
              marginBottom: '4px',
              fontWeight: 600,
            }}
          >
            <Pin size={12} /> Pinned Message
          </div>
        )}

        {/* Sender name for group chats */}
        {isGroup && !isSent && !message.deletedForEveryone && (
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--accent-tertiary)',
              marginBottom: '3px',
            }}
          >
            {message.sender.displayName}
          </div>
        )}

        {/* Reply preview if replying to another message */}
        {message.replyToContent && !message.deletedForEveryone && (
          <div
            style={{
              borderLeft: '3px solid rgba(255, 255, 255, 0.5)',
              background: 'rgba(0, 0, 0, 0.2)',
              padding: '6px 10px',
              borderRadius: '6px',
              marginBottom: '8px',
              fontSize: '12px',
            }}
          >
            <span style={{ fontWeight: 600, display: 'block', fontSize: '11px', opacity: 0.95 }}>
              {message.replyToSenderName || 'Original message'}
            </span>
            <span style={{ opacity: 0.85 }}>{message.replyToContent}</span>
          </div>
        )}

        {/* Media rendering: IMAGE */}
        {message.messageType === 'IMAGE' && message.mediaUrl && !message.deletedForEveryone && (
          <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}>
            <img
              src={resolveMediaUrl(message.mediaUrl)}
              alt={message.mediaFileName || 'Image attachment'}
              onClick={() => setImageModalOpen(true)}
              style={{
                width: '100%',
                maxHeight: '300px',
                objectFit: 'cover',
                borderRadius: '8px',
                display: 'block',
              }}
            />
          </div>
        )}

        {/* Media rendering: FILE / DOCUMENT */}
        {message.messageType === 'FILE' && message.mediaUrl && !message.deletedForEveryone && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 12px',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              marginBottom: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileText size={20} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, wordBreak: 'break-all' }}>
                  {message.mediaFileName || 'Document'}
                </div>
                <div style={{ fontSize: '11px', opacity: 0.7 }}>
                  {formatFileSize(message.mediaFileSize)}
                </div>
              </div>
            </div>
            <a
              href={resolveMediaUrl(message.mediaUrl)}
              download={message.mediaFileName || 'download'}
              target="_blank"
              rel="noreferrer"
              style={{
                color: 'inherit',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Download size={18} />
            </a>
          </div>
        )}

        {/* Media rendering: VOICE with WhatsApp Speed Multiplier & Live Waveform */}
        {message.messageType === 'VOICE' && !message.deletedForEveryone && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: 'rgba(0,0,0,0.18)',
              borderRadius: '10px',
              marginBottom: '6px',
              minWidth: '240px',
            }}
          >
            {/* HTML Audio Player */}
            <audio
              ref={audioRef}
              src={resolveMediaUrl(message.mediaUrl)}
              preload="metadata"
              onTimeUpdate={() => {
                if (audioRef.current) setAudioCurrentTime(audioRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (audioRef.current && Number.isFinite(audioRef.current.duration)) {
                  setAudioDuration(audioRef.current.duration);
                }
              }}
              onEnded={() => {
                setIsPlayingAudio(false);
                setAudioCurrentTime(0);
              }}
            />

            {/* Play/Pause Button */}
            <button
              onClick={() => {
                if (!audioRef.current) return;
                if (isPlayingAudio) {
                  audioRef.current.pause();
                  setIsPlayingAudio(false);
                } else {
                  audioRef.current.playbackRate = audioSpeed;
                  audioRef.current.play().then(() => {
                    setIsPlayingAudio(true);
                  }).catch(() => {
                    setIsPlayingAudio(false);
                  });
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: isSent ? 'rgba(255,255,255,0.25)' : 'var(--accent-primary)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isPlayingAudio ? <Pause size={16} /> : <Play size={16} style={{ marginLeft: '2px' }} />}
            </button>

            {/* Interactive Audio Waveform Bars */}
            <div
              style={{ display: 'flex', gap: '3px', alignItems: 'center', flex: 1, height: '24px', cursor: 'pointer' }}
              onClick={(e) => {
                if (!audioRef.current) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const targetDur = audioDuration || 10;
                audioRef.current.currentTime = ratio * targetDur;
                setAudioCurrentTime(ratio * targetDur);
              }}
              title="Click to seek"
            >
              {[8, 18, 12, 22, 16, 26, 14, 20, 10, 24, 18, 14, 22, 12, 18, 10].map((h, idx, arr) => {
                const totalBars = arr.length;
                const progressRatio = audioDuration > 0 ? audioCurrentTime / audioDuration : 0;
                const isPlayed = idx / totalBars <= progressRatio;
                return (
                  <div
                    key={idx}
                    style={{
                      width: '3px',
                      height: `${h}px`,
                      background: isPlayed
                        ? isSent
                          ? '#fff'
                          : 'var(--accent-primary)'
                        : 'rgba(255, 255, 255, 0.3)',
                      borderRadius: '2px',
                      transition: 'all 0.15s',
                    }}
                  />
                );
              })}
            </div>

            {/* Elapsed / Total Time */}
            <span style={{ fontSize: '11px', opacity: 0.85, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {(() => {
                const total = Math.round(audioDuration || 0);
                const cur = Math.round(audioCurrentTime || 0);
                const curM = Math.floor(cur / 60);
                const curS = (cur % 60).toString().padStart(2, '0');
                if (total > 0) {
                  const totM = Math.floor(total / 60);
                  const totS = (total % 60).toString().padStart(2, '0');
                  return `${curM}:${curS} / ${totM}:${totS}`;
                }
                return `${curM}:${curS}`;
              })()}
            </span>

            {/* Playback Speed Multiplier */}
            <button
              onClick={() => {
                const nextSpeed = audioSpeed === 1 ? 1.5 : audioSpeed === 1.5 ? 2 : 1;
                setAudioSpeed(nextSpeed);
                if (audioRef.current) {
                  audioRef.current.playbackRate = nextSpeed;
                }
              }}
              style={{
                border: 'none',
                background: isSent ? 'rgba(255,255,255,0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: isSent ? '#fff' : 'var(--accent-primary)',
                fontWeight: 700,
                fontSize: '10px',
                padding: '3px 6px',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              title="Change playback speed"
            >
              {audioSpeed}x
            </button>
          </div>
        )}

        {/* Media rendering: LOCATION (WhatsApp Live & Static Location Card) */}
        {message.messageType === 'LOCATION' && message.locationData && !message.deletedForEveryone && (
          <div
            style={{
              borderRadius: '10px',
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.1)',
              marginBottom: '6px',
              maxWidth: '300px',
            }}
          >
            {/* Map snapshot header */}
            <div
              style={{
                height: '110px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.2 }}
                xmlns="http://www.w3.org/2000/svg"
              >
                <line x1="0" y1="30" x2="100%" y2="30" stroke="#38bdf8" strokeWidth="2" />
                <line x1="0" y1="70" x2="100%" y2="70" stroke="#38bdf8" strokeWidth="3" />
                <line x1="60" y1="0" x2="60" y2="100%" stroke="#38bdf8" strokeWidth="2" />
                <line x1="160" y1="0" x2="160" y2="100%" stroke="#38bdf8" strokeWidth="4" />
                <line x1="240" y1="0" x2="240" y2="100%" stroke="#38bdf8" strokeWidth="2" />
              </svg>

              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(239, 68, 68, 0.7)',
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                <MapPin size={18} />
              </div>

              {message.locationData.isLive && (
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    fontSize: '9px',
                    fontWeight: 700,
                    background: '#ef4444',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    letterSpacing: '0.4px',
                  }}
                >
                  LIVE BEACON
                </span>
              )}
            </div>

            <div style={{ padding: '10px 12px' }}>
              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>
                {message.locationData.name}
              </div>
              {message.locationData.address && (
                <div style={{ fontSize: '11px', opacity: 0.7, marginBottom: '8px' }}>
                  {message.locationData.address}
                </div>
              )}
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${message.locationData.latitude},${message.locationData.longitude}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isSent ? '#fff' : 'var(--accent-primary)',
                  textDecoration: 'none',
                }}
              >
                <span>Open in Maps</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        {/* Interactive Poll Rendering */}
        {message.poll && !message.deletedForEveryone && (
          <div style={{ margin: '4px 0 8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <BarChart2 size={16} style={{ color: 'var(--accent-primary)' }} />
              <span style={{ fontWeight: 700, fontSize: '14px' }}>{message.poll.question}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {message.poll.options.map((opt) => {
                const totalVotes = message.poll!.totalVotes || 1;
                const percent = Math.round((opt.votes.length / Math.max(totalVotes, 1)) * 100);
                const hasVoted = opt.votes.includes(currentUser.displayName);

                return (
                  <div
                    key={opt.id}
                    onClick={() => onVotePoll && onVotePoll(message.id, opt.id)}
                    style={{
                      position: 'relative',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(0,0,0,0.2)',
                      border: hasVoted ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.08)',
                      cursor: 'pointer',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Fill percentage bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${percent}%`,
                        background: hasVoted ? 'rgba(108, 92, 255, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        zIndex: 0,
                        transition: 'width 0.3s ease',
                      }}
                    />

                    <div
                      style={{
                        position: 'relative',
                        zIndex: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {hasVoted ? (
                          <CheckCircle size={15} style={{ color: 'var(--accent-primary)' }} />
                        ) : (
                          <div
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              border: '1px solid rgba(255,255,255,0.3)',
                            }}
                          />
                        )}
                        <span style={{ fontWeight: hasVoted ? 600 : 400 }}>{opt.text}</span>
                      </div>
                      <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 600 }}>
                        {opt.votes.length} ({percent}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '8px', textAlign: 'right' }}>
              {message.poll.totalVotes} vote{message.poll.totalVotes === 1 ? '' : 's'}
            </div>
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          <div style={{ wordBreak: 'break-word', fontSize: '14px', lineHeight: 1.5 }}>
            {renderFormattedText(message.content)}
          </div>
        )}

        {/* Message Meta (Time, Star, Pin, Edited, Status) */}
        <div className="message-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
          {message.isPinned && (
            <span title="Pinned message" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Pin size={11} style={{ color: 'var(--accent-primary)', fill: 'var(--accent-primary)', marginRight: '2px', transform: 'rotate(45deg)' }} />
            </span>
          )}
          {message.isStarred && (
            <span title="Starred message" style={{ display: 'inline-flex', alignItems: 'center' }}>
              <Star size={12} style={{ fill: '#f59e0b', color: '#f59e0b', marginRight: '2px' }} />
            </span>
          )}
          {message.edited && !message.deletedForEveryone && (
            <span style={{ fontStyle: 'italic', opacity: 0.75, marginRight: '2px', fontSize: '11px' }}>
              edited
            </span>
          )}
          <span>{formatTime(message.createdAt)}</span>

          {isSent && !message.deletedForEveryone && (
            <span
              className={`receipt-icon ${message.status === 'READ' ? 'read' : ''}`}
              title={message.status === 'READ' ? 'Read' : message.status === 'DELIVERED' ? 'Delivered' : message.status === 'PENDING' ? 'Sending…' : 'Sent'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                marginLeft: '3px',
                color: message.status === 'READ' ? '#53bdeb' : 'rgba(255, 255, 255, 0.7)',
              }}
            >
              {message.status === 'PENDING' ? (
                <Clock size={12} />
              ) : message.status === 'SENT' ? (
                <Check size={14} />
              ) : (
                <CheckCheck size={14} />
              )}
            </span>
          )}
        </div>

        {/* Message Reactions display pills */}
        {message.reactions && message.reactions.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '4px',
              marginTop: '6px',
            }}
          >
            {message.reactions.map((r, i) => (
              <div
                key={i}
                onClick={() => onReact && onReact(message.id, r.emoji)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  backdropFilter: 'blur(4px)',
                  padding: '2px 6px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                title={r.users.join(', ')}
              >
                <span>{r.emoji}</span>
                <span style={{ fontWeight: 600 }}>{r.count}</span>
              </div>
            ))}
          </div>
        )}

        {/* Quick Reaction trigger button & menu trigger */}
        {!message.deletedForEveryone && (
          <div
            className="message-hover-actions"
            style={{
              position: 'absolute',
              top: '-12px',
              right: isSent ? 'auto' : '-32px',
              left: isSent ? '-60px' : 'auto',
              display: 'flex',
              gap: '4px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              borderRadius: '20px',
              padding: '2px 4px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
              }}
              title="React"
            >
              <Smile size={14} />
            </button>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
              }}
              title="More"
            >
              <MoreVertical size={14} />
            </button>
          </div>
        )}

        {/* Reaction Popover Bar */}
        {showReactionPicker && (
          <div
            style={{
              position: 'absolute',
              top: '-42px',
              left: isSent ? '-140px' : '0',
              zIndex: 100,
              background: 'var(--bg-elevated)',
              backdropFilter: 'blur(16px)',
              border: '1px solid var(--border-default)',
              borderRadius: '24px',
              padding: '4px 8px',
              display: 'flex',
              gap: '6px',
              boxShadow: 'var(--shadow-md)',
              animation: 'fadeIn 0.15s ease-out',
            }}
            onMouseLeave={() => setShowReactionPicker(false)}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  if (onReact) onReact(message.id, emoji);
                  setShowReactionPicker(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Dropdown Menu */}
        {showMenu && (
          <div
            className="message-actions-menu"
            style={{ position: 'absolute', top: '24px', right: '0', zIndex: 101 }}
            onMouseLeave={() => setShowMenu(false)}
          >
            <button
              className="menu-item"
              onClick={() => {
                onReply(message);
                setShowMenu(false);
              }}
            >
              <Reply size={14} />
              <span>Reply</span>
            </button>

            {onForward && (
              <button
                className="menu-item"
                onClick={() => {
                  onForward(message);
                  setShowMenu(false);
                }}
              >
                <Forward size={14} />
                <span>Forward</span>
              </button>
            )}

            {onToggleStar && (
              <button
                className="menu-item"
                onClick={() => {
                  onToggleStar(message.id);
                  setShowMenu(false);
                }}
              >
                <Star size={14} />
                <span>{message.isStarred ? 'Unstar' : 'Star message'}</span>
              </button>
            )}

            {onTogglePin && (
              <button
                className="menu-item"
                onClick={() => {
                  onTogglePin(message.id);
                  setShowMenu(false);
                }}
              >
                <Pin size={14} />
                <span>{message.isPinned ? 'Unpin message' : 'Pin message'}</span>
              </button>
            )}

            <button className="menu-item" onClick={handleCopy}>
              <Copy size={14} />
              <span>Copy text</span>
            </button>

            {isSent && (
              <button
                className="menu-item"
                onClick={() => {
                  onEdit(message);
                  setShowMenu(false);
                }}
              >
                <Edit2 size={14} />
                <span>Edit</span>
              </button>
            )}

            <button
              className="menu-item danger"
              onClick={() => {
                onDeleteForMe(message.id);
                setShowMenu(false);
              }}
            >
              <Trash2 size={14} />
              <span>Delete for me</span>
            </button>

            {isSent && (
              <button
                className="menu-item danger"
                onClick={() => {
                  onDeleteForEveryone(message.id);
                  setShowMenu(false);
                }}
              >
                <Trash2 size={14} />
                <span>Delete for everyone</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {imageModalOpen && message.mediaUrl && (
        <div
          onClick={() => setImageModalOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            cursor: 'zoom-out',
          }}
        >
          <img
            src={resolveMediaUrl(message.mediaUrl)}
            alt="Enlarged"
            style={{
              maxWidth: '90vw',
              maxHeight: '90vh',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          />
        </div>
      )}
    </div>
  );
};
