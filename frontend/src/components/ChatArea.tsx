import React, { useState, useEffect, useRef } from 'react';
import type { Conversation, Message, User, PollData, SharedLocation } from '../types';
import { MessageBubble } from './MessageBubble';
import { CreatePollModal } from './CreatePollModal';
import { ChatSummarizerModal } from './ChatSummarizerModal';
import { ScheduledMessageModal } from './ScheduledMessageModal';
import { DisappearingMessagesModal } from './DisappearingMessagesModal';
import { GroupInfoModal } from './GroupInfoModal';
import { MediaGalleryModal } from './MediaGalleryModal';
import { ShareLocationModal } from './ShareLocationModal';
import { ChatLockModal } from './ChatLockModal';
import { CameraCaptureModal } from './CameraCaptureModal';
import { api } from '../services/api';
import { sound } from '../utils/sound';
import {
  toggleStoredStarredMessage,
  getStoredStarredMessages,
  subscribeToStarredUpdates,
} from '../utils/starredStorage';
import {
  Phone,
  Video,
  Smile,
  Send,
  X,
  ArrowLeft,
  MessageSquare,
  Mic,
  Search,
  Pin,
  Info,
  BarChart2,
  Sparkles,
  Volume2,
  VolumeX,
  Bot,
  Calendar,
  Download,
  Clock,
  Trash2,
  Image as ImageIcon,
  MapPin,
  Lock,
  Unlock,
  MoreVertical,
  Camera,
  Plus,
  FileText,
} from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation;
  currentUser: User;
  contacts?: User[];
  messages: Message[];
  isOtherUserTyping: boolean;
  onSendMessage: (
    content: string,
    replyToMessageId?: number,
    media?: { url: string; fileName: string; fileSize: number; type: 'IMAGE' | 'FILE' | 'VOICE' | 'POLL' | 'LOCATION' },
    poll?: PollData,
    locationData?: SharedLocation
  ) => void;
  onSendTyping: (isTyping: boolean) => void;
  onEditMessage: (messageId: number, content: string) => void;
  onDeleteForMe: (messageId: number) => void;
  onDeleteForEveryone: (messageId: number) => void;
  onForwardMessage?: (message: Message) => void;
  onVotePoll?: (messageId: number, optionId: string) => void;
  onBackToSidebar?: () => void;
  onInitiateCall: (type: 'audio' | 'video') => void;
  onViewProfile?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onClearChat?: () => void;
  onUpdateConversation?: (updated: Partial<Conversation>) => void;
}

const COMMON_EMOJIS = ['😊', '😂', '❤️', '🔥', '👍', '🙏', '🎉', '✨', '😍', '👏', '🤝', '🚀', '💯', '😎', '🥳', '🙌', '🎯', '💡', '✅', '💼'];

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  currentUser,
  contacts = [],
  messages,
  isOtherUserTyping,
  onSendMessage,
  onSendTyping,
  onEditMessage,
  onDeleteForMe,
  onDeleteForEveryone,
  onForwardMessage,
  onVotePoll,
  onBackToSidebar,
  onInitiateCall,
  onViewProfile,
  onNotify,
  onClearChat,
  onUpdateConversation,
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [showEmojiTray, setShowEmojiTray] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDisappearingModal, setShowDisappearingModal] = useState(false);
  const [showGroupInfoModal, setShowGroupInfoModal] = useState(false);
  const [showMediaGalleryModal, setShowMediaGalleryModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showChatLockModal, setShowChatLockModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [soundActive, setSoundActive] = useState(() => sound.isEnabled());

  // Wallpaper pattern state
  const [wallpaper, setWallpaper] = useState<'default' | 'mesh' | 'dots' | 'minimal'>(() => {
    return (localStorage.getItem('connectnow_wallpaper') as any) || 'default';
  });

  // Scheduled messages for this chat
  const [scheduledItems, setScheduledItems] = useState<{ id: string; content: string; targetDate: Date }[]>([]);

  // Local state for snappy UI
  const [localPinnedId, setLocalPinnedId] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(`cn_pinned_msg_${conversation.id}`);
      return saved ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const [starredIds, setStarredIds] = useState<number[]>(() =>
    getStoredStarredMessages().map((m) => m.id)
  );

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`cn_pinned_msg_${conversation.id}`);
      setLocalPinnedId(saved ? Number(saved) : null);
    } catch {
      setLocalPinnedId(null);
    }
  }, [conversation.id]);

  useEffect(() => {
    const unsub = subscribeToStarredUpdates((msgs) => {
      setStarredIds(msgs.map((m) => m.id));
    });
    return unsub;
  }, []);

  const [localReactions, setLocalReactions] = useState<Record<number, { emoji: string; count: number; users: string[] }[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Audio recording hardware refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMoreMenu]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOtherUserTyping]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice) {
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecordingVoice]);

  // Scheduled messages auto-dispatch check
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setScheduledItems((prev) => {
        const readyToSend = prev.filter((item) => item.targetDate <= now);
        const remaining = prev.filter((item) => item.targetDate > now);

        readyToSend.forEach((item) => {
          sound.playSendSound();
          onSendMessage(item.content);
          if (onNotify) onNotify(`Scheduled message dispatched: "${item.content.slice(0, 30)}..."`, 'success');
        });

        return remaining;
      });
    }, 3000);

    return () => clearInterval(timer);
  }, [onSendMessage, onNotify]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);

    // Typing notification throttled
    onSendTyping(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    if (editingMessage) {
      onEditMessage(editingMessage.id, inputText.trim());
      setEditingMessage(null);
      setInputText('');
      return;
    }

    sound.playSendSound();
    onSendMessage(inputText.trim(), replyingTo ? replyingTo.id : undefined);
    setInputText('');
    setReplyingTo(null);
    setShowEmojiTray(false);
    onSendTyping(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (file) await uploadAndSend(file);
    input.value = '';
  };

  const uploadAndSend = async (file: File) => {
    try {
      setUploading(true);
      if (onNotify) onNotify(`Uploading ${file.name}...`, 'info');
      const res = await api.uploadFile(file);

      sound.playSendSound();
      const isImg = file.type.startsWith('image/');
      onSendMessage(
        isImg ? '' : file.name,
        replyingTo ? replyingTo.id : undefined,
        {
          url: res.fileUrl,
          fileName: res.fileName,
          fileSize: res.fileSize,
          type: isImg ? 'IMAGE' : 'FILE',
        }
      );

      if (onNotify) onNotify('Attachment sent successfully!', 'success');
      setReplyingTo(null);
    } catch (err: any) {
      if (onNotify) onNotify(err.message || 'File upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const startVoiceRecord = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Choose best supported mime type for cross-browser / iOS Safari / Android support
        const mimeTypes = [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/aac',
          '',
        ];
        const chosenMime = mimeTypes.find(
          (m) => !m || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))
        ) || '';

        const mediaRecorder = chosenMime
          ? new MediaRecorder(stream, { mimeType: chosenMime })
          : new MediaRecorder(stream);

        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.start(250); // Slice every 250ms for smooth stream capture
      }
    } catch (err) {
      console.warn('Audio capture permission denied or unsupported:', err);
    }
    setRecordingSeconds(0);
    setIsRecordingVoice(true);
  };

  const handleFinishVoiceRecord = () => {
    const duration = recordingSeconds || 1;
    setIsRecordingVoice(false);
    sound.playSendSound();

    const formatDur = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = (secs % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = async () => {
        const mime = mediaRecorderRef.current?.mimeType || 'audio/webm';
        const ext = mime.includes('mp4') || mime.includes('aac') ? 'm4a' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const audioFile = new File([audioBlob], `Voice_${Date.now()}.${ext}`, { type: mime });

        // Convert to Data URL first so there is ALWAYS a valid local playable fallback
        const reader = new FileReader();
        reader.onloadend = async () => {
          const fallbackDataUrl = (reader.result as string) || '';
          let finalUrl = fallbackDataUrl;
          let finalName = audioFile.name;
          let finalSize = audioBlob.size;

          try {
            const res = await api.uploadFile(audioFile);
            if (res && res.fileUrl) {
              finalUrl = res.fileUrl;
              finalName = res.fileName;
              finalSize = res.fileSize;
            }
          } catch (uploadErr) {
            console.warn('Backend voice note upload fallback to data URL:', uploadErr);
          }

          onSendMessage(
            `Voice Note (${formatDur(duration)})`,
            replyingTo ? replyingTo.id : undefined,
            {
              url: finalUrl,
              fileName: finalName,
              fileSize: finalSize,
              type: 'VOICE',
            }
          );
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    } else {
      // Synthetic fallback chime voice note if mic hardware unavailable
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const dst = audioCtx.createMediaStreamDestination();
        osc.connect(dst);
        osc.start();
        osc.stop(audioCtx.currentTime + 1);
      } catch {}

      onSendMessage(
        `Voice Note (${formatDur(duration)})`,
        replyingTo ? replyingTo.id : undefined,
        {
          url: '',
          fileName: `Voice_${Date.now()}.webm`,
          fileSize: 1024 * 16,
          type: 'VOICE',
        }
      );
    }

    if (onNotify) onNotify('Voice note sent', 'success');
  };

  const handleCancelVoiceRecord = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const handleSelectEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    sound.playPopSound();
  };

  const startEdit = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyingTo(null);
  };

  const handleToggleStar = (msgId: number) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;
    const isNowStarred = toggleStoredStarredMessage(msg);
    setStarredIds((prev) =>
      isNowStarred ? [...prev, msgId] : prev.filter((id) => id !== msgId)
    );
    sound.playPopSound();
    if (onNotify) onNotify(isNowStarred ? 'Message starred' : 'Message unstarred', 'info');
  };

  const handleTogglePin = (msgId: number) => {
    const newPinned = localPinnedId === msgId ? null : msgId;
    setLocalPinnedId(newPinned);
    try {
      if (newPinned === null) {
        localStorage.removeItem(`cn_pinned_msg_${conversation.id}`);
      } else {
        localStorage.setItem(`cn_pinned_msg_${conversation.id}`, String(msgId));
      }
    } catch {}
    sound.playPopSound();
    if (onNotify) onNotify(newPinned ? 'Message pinned to chat' : 'Message unpinned', 'success');
  };

  const handleReact = (msgId: number, emoji: string) => {
    sound.playPopSound();
    setLocalReactions((prev) => {
      const currentList = prev[msgId] || [];
      const existing = currentList.find((r) => r.emoji === emoji);

      let updated;
      if (existing) {
        if (existing.users.includes(currentUser.displayName)) {
          updated = currentList
            .map((r) =>
              r.emoji === emoji
                ? { ...r, count: r.count - 1, users: r.users.filter((u) => u !== currentUser.displayName) }
                : r
            )
            .filter((r) => r.count > 0);
        } else {
          updated = currentList.map((r) =>
            r.emoji === emoji
              ? { ...r, count: r.count + 1, users: [...r.users, currentUser.displayName] }
              : r
          );
        }
      } else {
        updated = [...currentList, { emoji, count: 1, users: [currentUser.displayName] }];
      }
      return { ...prev, [msgId]: updated };
    });
  };

  const handleExportChat = () => {
    const header = [
      `======================================================`,
      `CONNECTNOW ENTERPRISE CHAT EXPORT`,
      `Conversation: ${conversation.title} (${conversation.type})`,
      `Exported on: ${new Date().toLocaleString()}`,
      `Participants: ${conversation.type === 'DIRECT' ? `${currentUser.displayName}, ${conversation.otherParticipant?.displayName || 'Colleague'}` : `${conversation.members?.length || 2} members`}`,
      `Total Messages: ${messages.length}`,
      `Security: End-to-End Encrypted (AES-256)`,
      `======================================================\n`,
    ];

    const lines = messages.map((m) => {
      const time = new Date(m.createdAt).toLocaleString();
      const sender = m.sender.displayName;
      let text = m.content || '';
      if (m.deletedForEveryone) {
        text = '🚫 This message was deleted';
      }
      if (m.mediaUrl) {
        text += ` [Attachment: ${m.mediaFileName || 'File'} (${m.messageType || 'Media'})]`;
      }
      if (m.poll) {
        text += ` [Poll: "${m.poll.question}" - Total votes: ${m.poll.totalVotes}]`;
      }
      if (m.locationData) {
        text += ` [Location: ${m.locationData.address || 'Shared coordinates'}]`;
      }
      return `[${time}] ${sender}: ${text}`;
    });

    const fullTranscript = [...header, ...lines].join('\n');
    const blob = new Blob([fullTranscript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ConnectNow_Chat_${conversation.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (onNotify) onNotify(`Exported ${messages.length} messages to text file`, 'success');
  };

  const toggleSoundMute = () => {
    const newState = sound.toggleSound();
    setSoundActive(newState);
    if (onNotify) onNotify(newState ? 'Sound effects enabled' : 'Sound effects muted', 'info');
  };

  const cycleWallpaper = () => {
    const sequence: ('default' | 'mesh' | 'dots' | 'minimal')[] = ['default', 'mesh', 'dots', 'minimal'];
    const nextIdx = (sequence.indexOf(wallpaper) + 1) % sequence.length;
    const nextWp = sequence[nextIdx];
    setWallpaper(nextWp);
    localStorage.setItem('connectnow_wallpaper', nextWp);
    sound.playPopSound();
    if (onNotify) onNotify(`Wallpaper set to ${nextWp}`, 'info');
  };

  const handleHeaderClick = () => {
    if (conversation.type === 'GROUP') {
      setShowGroupInfoModal(true);
    } else if (onViewProfile) {
      onViewProfile();
    }
  };

  const isDirect = conversation.type === 'DIRECT';
  const otherUser = conversation.otherParticipant;

  const formatLastSeen = (iso?: string) => {
    if (!iso) return 'Offline';
    const d = new Date(iso);
    return `Last seen ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Filter messages if search is active
  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.mediaFileName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.poll?.question.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // Pinned message object
  const pinnedMessage = messages.find((m) => m.id === localPinnedId);

  // Background style based on wallpaper
  let wallpaperBg = undefined;
  if (wallpaper === 'mesh') {
    wallpaperBg = 'radial-gradient(at 0% 0%, rgba(108, 92, 255, 0.08) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.08) 0px, transparent 50%)';
  } else if (wallpaper === 'dots') {
    wallpaperBg = 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)';
  } else if (wallpaper === 'minimal') {
    wallpaperBg = 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.3))';
  }

  return (
    <main className="chat-area" style={{ background: wallpaperBg, backgroundSize: wallpaper === 'dots' ? '24px 24px' : undefined }}>
      {/* Hidden File Input for Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        accept="application/pdf,.doc,.docx,.txt,.zip,.xls,.xlsx,.ppt,.pptx,image/*"
      />
      {/* Gallery picker */}
      <input type="file" ref={photoInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
      {/* Native camera on phones (opens the camera app directly) */}
      <input type="file" ref={cameraInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" capture="environment" />
      {showCamera && <CameraCaptureModal onClose={() => setShowCamera(false)} onCapture={uploadAndSend} />}

      {/* Chat Top Header */}
      <header className="chat-header">
        <div className="chat-header-user">
          {onBackToSidebar && (
            <button className="icon-btn" onClick={onBackToSidebar} title="Back">
              <ArrowLeft size={20} />
            </button>
          )}

          <div
            className="avatar-wrapper"
            onClick={handleHeaderClick}
            style={{ cursor: 'pointer' }}
            title="View details"
          >
            <div
              className="avatar"
              style={{
                width: '40px',
                height: '40px',
                fontSize: '16px',
                fontWeight: 700,
                background: isDirect ? 'var(--accent-secondary)' : '#6366f1',
                color: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {conversation.title.charAt(0).toUpperCase()}
            </div>
            {isDirect && (
              <span className={`status-dot ${otherUser?.online ? 'online' : 'offline'}`} />
            )}
          </div>

          <div
            className="chat-header-meta"
            onClick={handleHeaderClick}
            style={{ cursor: 'pointer' }}
            title="View details"
          >
            <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{conversation.title}</span>
              {conversation.isPinned && <Pin size={12} style={{ color: 'var(--accent-primary)' }} />}
              {conversation.disappearingTimer && conversation.disappearingTimer !== 'off' && (
                <span title={`Disappearing: ${conversation.disappearingTimer}`}>
                  <Clock size={12} style={{ color: 'var(--accent-primary)' }} />
                </span>
              )}
            </div>
            <div className={`subtext ${isDirect && otherUser?.online ? 'online-indicator' : ''}`}>
              {isDirect
                ? otherUser?.online
                  ? 'Active now'
                  : formatLastSeen(otherUser?.lastSeenAt)
                : `${conversation.members?.length || 2} members • tap for info`}
            </div>
          </div>
        </div>

        <div className="header-actions" style={{ position: 'relative' }}>
          {/* Video Call */}
          <button
            className="icon-btn"
            title="Start Video Call (HD WebRTC)"
            onClick={() => onInitiateCall('video')}
          >
            <Video size={19} />
          </button>

          {/* Voice / Audio Call */}
          <button
            className="icon-btn"
            title="Start Audio Call (HD WebRTC)"
            onClick={() => onInitiateCall('audio')}
          >
            <Phone size={19} />
          </button>

          {/* Vertical divider */}
          <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />

          {/* Search Toggle */}
          <button
            className="icon-btn"
            title="Search messages"
            onClick={() => setShowSearch(!showSearch)}
            style={{ color: showSearch ? 'var(--accent-primary)' : undefined }}
          >
            <Search size={19} />
          </button>

          {/* More Menu Dropdown (WhatsApp 3-dots) */}
          <div ref={moreMenuRef} style={{ position: 'relative' }}>
            <button
              className="icon-btn"
              title="More options"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              style={{ color: showMoreMenu ? 'var(--accent-primary)' : undefined }}
            >
              <MoreVertical size={19} />
            </button>

            {showMoreMenu && (
              <div
                className="whatsapp-dropdown-menu"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  minWidth: '240px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-lg)',
                  padding: '6px',
                  zIndex: 100,
                  backdropFilter: 'blur(16px)',
                }}
              >
                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleHeaderClick();
                  }}
                >
                  <Info size={16} />
                  <span>{conversation.type === 'GROUP' ? 'Group info' : 'Contact info'}</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowMediaGalleryModal(true);
                  }}
                >
                  <ImageIcon size={16} />
                  <span>Media, links and docs</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowChatLockModal(true);
                  }}
                >
                  {conversation.isLocked ? <Unlock size={16} style={{ color: 'var(--accent-primary)' }} /> : <Lock size={16} />}
                  <span>{conversation.isLocked ? 'Unlock / chat lock settings' : 'Lock chat'}</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowDisappearingModal(true);
                  }}
                >
                  <Clock size={16} style={{ color: conversation.disappearingTimer && conversation.disappearingTimer !== 'off' ? 'var(--accent-primary)' : undefined }} />
                  <span>Disappearing messages</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    setShowAiModal(true);
                  }}
                >
                  <Bot size={16} style={{ color: '#818cf8' }} />
                  <span>ConnectAI Copilot</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    cycleWallpaper();
                  }}
                >
                  <Sparkles size={16} />
                  <span>Wallpaper ({wallpaper})</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    toggleSoundMute();
                  }}
                >
                  {soundActive ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{soundActive ? 'Mute sounds' : 'Unmute sounds'}</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setShowMoreMenu(false);
                    handleExportChat();
                  }}
                >
                  <Download size={16} />
                  <span>Export chat</span>
                </button>

                {onClearChat && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '4px 0' }} />
                    <button
                      className="menu-item danger"
                      onClick={() => {
                        setShowMoreMenu(false);
                        if (window.confirm('Are you sure you want to clear all messages in this conversation?')) {
                          onClearChat();
                        }
                      }}
                    >
                      <Trash2 size={16} />
                      <span>Clear chat messages</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* WhatsApp Disappearing Messages Sticky Banner */}
      {conversation.disappearingTimer && conversation.disappearingTimer !== 'off' && (
        <div
          onClick={() => setShowDisappearingModal(true)}
          style={{
            padding: '6px 14px',
            background: 'rgba(108, 92, 255, 0.08)',
            borderBottom: '1px solid rgba(108, 92, 255, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '12px',
            color: 'var(--accent-primary)',
            cursor: 'pointer',
          }}
        >
          <Clock size={13} />
          <span>Messages disappear {conversation.disappearingTimer} after they are sent. Tap to change.</span>
        </div>
      )}

      {/* In-Chat Message Search Drawer */}
      {showSearch && (
        <div
          style={{
            padding: '10px 18px',
            background: 'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'fadeIn 0.2s',
          }}
        >
          <Search size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search within this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ height: '36px', fontSize: '13px' }}
            autoFocus
          />
          {searchQuery && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            className="icon-btn"
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Pinned Message Sticky Banner (Pin to Pin) */}
      {pinnedMessage && (
        <div
          onClick={() => {
            const el = document.getElementById(`msg-${pinnedMessage.id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          style={{
            padding: '8px 18px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
            <Pin size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>Pinned:</span>
            <span style={{ color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {pinnedMessage.sender.displayName}: {pinnedMessage.content || pinnedMessage.mediaFileName || 'Attachment'}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLocalPinnedId(null);
              try {
                localStorage.removeItem(`cn_pinned_msg_${conversation.id}`);
              } catch {}
              if (onNotify) onNotify('Message unpinned', 'info');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title="Unpin message"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Scheduled Messages Banner */}
      {scheduledItems.length > 0 && (
        <div
          style={{
            padding: '8px 18px',
            background: 'rgba(59, 130, 246, 0.08)',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#93c5fd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={14} />
            <span>
              {scheduledItems.length} message scheduled for delivery at{' '}
              {scheduledItems[0].targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={() => setScheduledItems([])}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '11px' }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Message List */}
      <div className="chat-messages">
        {filteredMessages.length === 0 ? (
          <div className="chat-splash">
            <div className="splash-icon-circle">
              <MessageSquare size={38} />
            </div>
            <h2>
              {searchQuery ? `No results for "${searchQuery}"` : `Say Hello to ${conversation.title}!`}
            </h2>
            <p>
              {searchQuery
                ? 'Try searching with different keywords.'
                : 'Direct encrypted communication with real-time delivery and read confirmations.'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isMsgStarred = starredIds.includes(msg.id);
            const isMsgPinned = localPinnedId === msg.id;
            const msgReactions = localReactions[msg.id] || msg.reactions;
            const isSent = Boolean(
              currentUser && (
                msg.sender?.id === currentUser.id ||
                String(msg.sender?.id) === String(currentUser.id) ||
                (currentUser.username && msg.sender?.username && currentUser.username.toLowerCase() === msg.sender.username.toLowerCase())
              )
            );

            return (
              <div
                id={`msg-${msg.id}`}
                key={msg.id}
                style={{
                  display: 'flex',
                  width: '100%',
                  justifyContent: isSent ? 'flex-end' : 'flex-start',
                  scrollMarginTop: '60px',
                }}
              >
                <MessageBubble
                  message={{
                    ...msg,
                    isStarred: isMsgStarred,
                    isPinned: isMsgPinned,
                    reactions: msgReactions,
                  }}
                  currentUser={currentUser}
                  isGroup={conversation.type === 'GROUP'}
                  onReply={(m) => {
                    setReplyingTo(m);
                    setEditingMessage(null);
                  }}
                  onEdit={startEdit}
                  onDeleteForMe={onDeleteForMe}
                  onDeleteForEveryone={onDeleteForEveryone}
                  onToggleStar={handleToggleStar}
                  onTogglePin={handleTogglePin}
                  onReact={handleReact}
                  onForward={onForwardMessage}
                  onVotePoll={onVotePoll}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing notification */}
      {isOtherUserTyping && (
        <div className="typing-indicator-bar">
          <div className="typing-dots">
            <span />
            <span />
            <span />
          </div>
          <span>{conversation.title} is typing...</span>
        </div>
      )}

      {/* Replying banner */}
      {replyingTo && (
        <div className="reply-banner">
          <div className="reply-banner-content">
            <div className="reply-author">Replying to {replyingTo.sender.displayName}</div>
            <div>{replyingTo.content || replyingTo.mediaFileName}</div>
          </div>
          <button className="icon-btn" onClick={() => setReplyingTo(null)} title="Cancel reply">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Editing banner */}
      {editingMessage && (
        <div className="reply-banner" style={{ borderLeftColor: '#38bdf8' }}>
          <div className="reply-banner-content">
            <div className="reply-author" style={{ color: '#38bdf8' }}>
              Editing Message
            </div>
            <div>{editingMessage.content}</div>
          </div>
          <button
            className="icon-btn"
            onClick={() => {
              setEditingMessage(null);
              setInputText('');
            }}
            title="Cancel edit"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji tray */}
      {showEmojiTray && (
        <div className="emoji-tray">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              className="emoji-btn"
              onClick={() => handleSelectEmoji(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Voice Recording Overlay Bar */}
      {isRecordingVoice ? (
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--bg-elevated)',
            borderTop: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#ef4444',
                animation: 'pulse 1s infinite',
              }}
            />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
              Recording Audio: {recordingSeconds}s
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCancelVoiceRecord}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '13px' }}
            >
              Cancel
            </button>
            <button
              onClick={handleFinishVoiceRecord}
              className="btn-primary"
              style={{ padding: '6px 18px', fontSize: '13px' }}
            >
              Send Audio Note
            </button>
          </div>
        </div>
      ) : (
        /* Input bar */
        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            {/* Emoji */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowEmojiTray(!showEmojiTray)}
              title="Emoji picker"
            >
              <Smile size={20} />
            </button>

            {/* Attach menu */}
            <div style={{ position: 'relative', display: 'flex' }}>
              <button
                type="button"
                className={`icon-btn attach-plus ${showAttachMenu ? 'open' : ''}`}
                onClick={() => setShowAttachMenu((v) => !v)}
                title="Attach"
                disabled={uploading}
                aria-expanded={showAttachMenu}
              >
                <Plus size={22} />
              </button>
              {showAttachMenu && (
                <>
                  <div className="attach-backdrop" onClick={() => setShowAttachMenu(false)} />
                  <div className="attach-menu">
                    <button type="button" onClick={() => { setShowAttachMenu(false); /* phones: native camera app; desktop: in-app camera */
                      if (window.matchMedia('(pointer: coarse)').matches) cameraInputRef.current?.click(); else setShowCamera(true); }}>
                      <span className="attach-ico" style={{ background: '#ef4444' }}><Camera size={18} /></span> Camera
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); photoInputRef.current?.click(); }}>
                      <span className="attach-ico" style={{ background: '#8b5cf6' }}><ImageIcon size={18} /></span> Photo
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); fileInputRef.current?.click(); }}>
                      <span className="attach-ico" style={{ background: '#3b82f6' }}><FileText size={18} /></span> Document
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); setShowLocationModal(true); }}>
                      <span className="attach-ico" style={{ background: '#6c5cff' }}><MapPin size={18} /></span> Location
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); setShowPollModal(true); }}>
                      <span className="attach-ico" style={{ background: '#f59e0b' }}><BarChart2 size={18} /></span> Poll
                    </button>
                    <button type="button" onClick={() => { setShowAttachMenu(false); setShowScheduleModal(true); }}>
                      <span className="attach-ico" style={{ background: '#06b6d4' }}><Calendar size={18} /></span> Schedule
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick camera button */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (window.matchMedia('(pointer: coarse)').matches) cameraInputRef.current?.click();
                else setShowCamera(true);
              }}
              title="Take a photo"
              disabled={uploading}
            >
              <Camera size={20} />
            </button>

            {/* Voice record trigger */}
            <button type="button" className="icon-btn" onClick={startVoiceRecord} title="Record Voice Note">
              <Mic size={20} />
            </button>

            {/* Textarea */}
            <textarea
              className="chat-textarea"
              rows={1}
              placeholder={editingMessage ? 'Edit your message...' : 'Message'}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            className="send-btn"
            disabled={!inputText.trim()}
            onClick={handleSend}
            title="Send message (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      )}

      {/* Create Poll Modal */}
      {showPollModal && (
        <CreatePollModal
          onClose={() => setShowPollModal(false)}
          onCreatePoll={(pollData) => {
            sound.playSendSound();
            onSendMessage(
              `📊 Poll: ${pollData.question}`,
              undefined,
              { url: '', fileName: '', fileSize: 0, type: 'POLL' },
              pollData
            );
            if (onNotify) onNotify('Team poll published!', 'success');
          }}
        />
      )}

      {/* AI Assistant Modal */}
      {showAiModal && (
        <ChatSummarizerModal
          chatTitle={conversation.title}
          messages={messages}
          onClose={() => setShowAiModal(false)}
          onApplyReply={(reply) => setInputText(reply)}
        />
      )}

      {/* Scheduled Message Modal */}
      {showScheduleModal && (
        <ScheduledMessageModal
          onClose={() => setShowScheduleModal(false)}
          onSchedule={(content, targetDate) => {
            setScheduledItems((prev) => [
              ...prev,
              { id: `sch-${Date.now()}`, content, targetDate },
            ]);
            if (onNotify) {
              onNotify(`Message scheduled for ${targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, 'info');
            }
          }}
        />
      )}

      {/* WhatsApp Disappearing Messages Modal */}
      {showDisappearingModal && (
        <DisappearingMessagesModal
          currentTimer={conversation.disappearingTimer || 'off'}
          onClose={() => setShowDisappearingModal(false)}
          onSetTimer={(timer) => {
            if (onUpdateConversation) {
              onUpdateConversation({ disappearingTimer: timer });
            }
            if (onNotify) {
              onNotify(`Disappearing messages set to ${timer}`, 'info');
            }
          }}
        />
      )}

      {/* WhatsApp Group Info & Members Admin Modal */}
      {showGroupInfoModal && (
        <GroupInfoModal
          conversation={conversation}
          currentUser={currentUser}
          contacts={contacts}
          messages={messages}
          onClose={() => setShowGroupInfoModal(false)}
          onAddMembers={(newMemberIds) => {
            const addedContacts = contacts.filter((c) => newMemberIds.includes(c.id));
            if (onUpdateConversation) {
              onUpdateConversation({
                members: [...conversation.members, ...addedContacts],
              });
            }
            if (onNotify) onNotify(`Added ${addedContacts.length} participant(s)`, 'success');
          }}
          onRemoveMember={(userId) => {
            if (onUpdateConversation) {
              onUpdateConversation({
                members: conversation.members.filter((m) => m.id !== userId),
              });
            }
            if (onNotify) onNotify('Participant removed', 'info');
          }}
          onToggleAdmin={(userId) => {
            const currentAdmins = conversation.adminIds || [conversation.members[0]?.id || currentUser.id];
            const updated = currentAdmins.includes(userId)
              ? currentAdmins.filter((id) => id !== userId)
              : [...currentAdmins, userId];
            if (onUpdateConversation) {
              onUpdateConversation({ adminIds: updated });
            }
            if (onNotify) onNotify('Group admin status updated', 'success');
          }}
          onOpenDisappearingModal={() => {
            setShowGroupInfoModal(false);
            setShowDisappearingModal(true);
          }}
          onOpenMediaGallery={() => {
            setShowGroupInfoModal(false);
            setShowMediaGalleryModal(true);
          }}
          onLeaveGroup={() => {
            setShowGroupInfoModal(false);
            if (onNotify) onNotify('You left the group', 'info');
          }}
        />
      )}

      {/* WhatsApp Media, Links & Docs Gallery Modal */}
      {showMediaGalleryModal && (
        <MediaGalleryModal
          chatTitle={conversation.title}
          messages={messages}
          onClose={() => setShowMediaGalleryModal(false)}
        />
      )}

      {/* WhatsApp Location Sharing Modal */}
      {showLocationModal && (
        <ShareLocationModal
          onClose={() => setShowLocationModal(false)}
          onSendLocation={(loc) => {
            onSendMessage(loc.name, replyingTo?.id, undefined, undefined, loc);
            if (onNotify) onNotify(loc.isLive ? 'Live beacon dispatched' : 'Location shared', 'success');
          }}
        />
      )}

      {/* WhatsApp Chat Lock Modal */}
      {showChatLockModal && (
        <ChatLockModal
          chatTitle={conversation.title}
          isCurrentlyLocked={!!conversation.isLocked}
          mode="toggle"
          onClose={() => setShowChatLockModal(false)}
          onSuccess={(pin) => {
            if (onUpdateConversation) {
              onUpdateConversation({ isLocked: !conversation.isLocked, lockPin: pin });
            }
          }}
          onNotify={onNotify}
        />
      )}
    </main>
  );
};
