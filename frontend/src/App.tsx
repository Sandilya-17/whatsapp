import React, { useState, useEffect, useRef } from 'react';
import type {
  User,
  Conversation,
  Message,
  ContactRequest,
  TypingNotification,
  PresenceNotification,
  Toast,
  PollData,
  SharedLocation,
} from './types';
import { api, getAuthToken, setAuthToken, ApiError } from './services/api';
import { wsService } from './services/websocket';
import { sound } from './utils/sound';
import { AuthModal } from './components/AuthModal';
import { Logo } from './components/Logo';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ContactSearchModal } from './components/ContactSearchModal';
import { SettingsModal } from './components/SettingsModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { UserProfileModal } from './components/UserProfileModal';
import { VideoCallModal } from './components/VideoCallModal';
import { IncomingCallModal } from './components/IncomingCallModal';
import { ForwardMessageModal } from './components/ForwardMessageModal';
import { StarredMessagesModal } from './components/StarredMessagesModal';
import { StatusStoriesModal } from './components/StatusStoriesModal';
import { LinkedDevicesModal } from './components/LinkedDevicesModal';
import { DownloadAppsModal } from './components/DownloadAppsModal';
import { ToastContainer } from './components/ToastContainer';
import { WifiOff, Users, Phone, Camera, Lock, Monitor, Search } from 'lucide-react';
import type { CallSignal } from './types';
import { addCallRecord } from './utils/callLogStorage';
import {
  requestPushPermissionOnFirstGesture,
  disablePush,
  clearNotifications,
  setAppBadge,
} from './utils/push';
import {
  getStoredStarredMessages,
  unstarStoredMessage,
  subscribeToStarredUpdates,
} from './utils/starredStorage';

const STATUS_RANK: Record<string, number> = { PENDING: 0, SENT: 1, DELIVERED: 2, READ: 3 };
const BASE_TITLE = 'ConnectNow — Enterprise Messaging';
/** The chat is on screen and the user is really looking at it (tab visible AND window focused). */
const isForegroundNow = () => document.visibilityState === 'visible' && document.hasFocus();
/** The server only knows plain message types; location / poll are enriched on the client. */
const toServerType = (t?: string) => (t === 'LOCATION' || t === 'POLL' ? 'TEXT' : t || 'TEXT');
const isMutedConv = (id: number) => {
  try {
    return (JSON.parse(localStorage.getItem('cn_muted_conv_ids') || '[]') as number[]).includes(id);
  } catch {
    return false;
  }
};
const isLockedConv = (id: number) => {
  try {
    return (JSON.parse(localStorage.getItem('cn_locked_conv_ids') || '[]') as number[]).includes(id);
  } catch {
    return false;
  }
};

interface OutboxItem {
  convId: number;
  data: Parameters<typeof api.sendMessage>[0];
  optimistic: Message;
  attempts: number;
}
/** Ticks only ever move forward: SENT -> DELIVERED -> READ. */
const maxStatus = (a?: string, b?: string) => ((STATUS_RANK[a || ''] || 0) >= (STATUS_RANK[b || ''] || 0) ? a : b) as Message['status'];

// The backend can sleep on a free host. Start-up retries on its own for about a minute before giving up.
const MAX_BOOT_RETRIES = 12;

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [bootFailed, setBootFailed] = useState(false);
  const [bootAutoRetries, setBootAutoRetries] = useState(0);
  const [bootAttempt, setBootAttempt] = useState(0);

  // Core Data
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Real-time states
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modals & Overlays
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [showStoriesModal, setShowStoriesModal] = useState(false);
  const [showLinkedDevicesModal, setShowLinkedDevicesModal] = useState(false);
  // Pairing code from a ?link=CODE URL (phone camera opened a PC's QR)
  const [incomingLinkCode, setIncomingLinkCode] = useState<string | null>(null);
  const [showDownloadAppsModal, setShowDownloadAppsModal] = useState(false);
  const [isMobilePreview, setIsMobilePreview] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [selectedProfileUser, setSelectedProfileUser] = useState<User | null>(null);
  
  // Real-time WebRTC Calling State
  const [activeCall, setActiveCall] = useState<{
    type: 'audio' | 'video';
    peerUser: User;
    isIncoming?: boolean;
    incomingOffer?: CallSignal | null;
  } | null>(null);
  const [incomingCallSignal, setIncomingCallSignal] = useState<CallSignal | null>(null);
  const [activeSignal, setActiveSignal] = useState<CallSignal | null>(null);
  const activeCallRef = useRef(activeCall);
  activeCallRef.current = activeCall;
  const incomingCallSignalRef = useRef(incomingCallSignal);
  incomingCallSignalRef.current = incomingCallSignal;
  // Latest state for long-lived WebSocket callbacks (they would otherwise see stale values)
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;
  const incomingCandidatesRef = useRef<any[]>([]);
  const outboxRef = useRef<OutboxItem[]>([]);
  const flushingRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);
  const pendingOpenConvRef = useRef<number | null>(null);

  // Starred messages persistent state
  const [starredMessages, setStarredMessages] = useState<Message[]>(() => getStoredStarredMessages());

  useEffect(() => {
    const unsub = subscribeToStarredUpdates((msgs) => {
      setStarredMessages(msgs);
    });
    return unsub;
  }, []);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Theme
  const [isDarkTheme, setIsDarkTheme] = useState(() => {
    return localStorage.getItem('connectnow_theme') !== 'light';
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTheme = () => {
    setIsDarkTheme((prev) => {
      const next = !prev;
      localStorage.setItem('connectnow_theme', next ? 'dark' : 'light');
      // Briefly animate colour changes so the switch cross-fades instead of snapping
      document.documentElement.classList.add('wa-theme-animating');
      window.setTimeout(() => document.documentElement.classList.remove('wa-theme-animating'), 500);
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.classList.remove('light-theme');
        document.body.classList.remove('light-theme');
      } else {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.classList.add('light-theme');
        document.body.classList.add('light-theme');
      }
      return next;
    });
  };

  // Sync theme with body and documentElement on mount
  useEffect(() => {
    if (!isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.add('light-theme');
      document.body.classList.add('light-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.remove('light-theme');
      document.body.classList.remove('light-theme');
    }
  }, [isDarkTheme]);

  // While the server is waking up, retry start-up with a growing pause instead of waiting for a tap.
  useEffect(() => {
    if (!bootFailed || bootAutoRetries >= MAX_BOOT_RETRIES) return;
    const delay = Math.min(2000 + bootAutoRetries * 1500, 8000);
    const timer = window.setTimeout(() => {
      setBootAutoRetries((n) => n + 1);
      setBootAttempt((n) => n + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [bootFailed, bootAutoRetries]);

  // Check initial authentication
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthToken(null);
      setCurrentUser(null);
      showToast('Your session has expired. Please sign in again.', 'warning');
    };
    window.addEventListener('auth:expired', handleAuthExpired);

    const token = getAuthToken();
    let cancelled = false;
    if (token) {
      setBootFailed(false);
      setLoadingInitial(true);
      api
        .getCurrentUser()
        .then((user) => {
          if (!cancelled) {
            setCurrentUser(user);
            setBootAutoRetries(0);
          }
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            // token genuinely invalid/expired -> sign in again
            setAuthToken(null);
            setCurrentUser(null);
          } else if (!cancelled) {
            // server asleep / network down: KEEP the session and let the user retry
            setBootFailed(true);
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingInitial(false);
        });
    } else {
      setLoadingInitial(false);
    }

    return () => {
      cancelled = true;
      window.removeEventListener('auth:expired', handleAuthExpired);
    };
  }, [bootAttempt]);

  // When user is authenticated, load data and connect WebSocket
  useEffect(() => {
    if (!currentUser) return;

    loadConversations();
    loadContacts();
    loadPendingRequests();
    loadBlockedUsers();

    // Connect WebSocket
    const unsubConn = wsService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (connected) {
        reportForeground();
        checkPendingCall();
        void deliverOutbox();
      }
    });

    const handleCallSignal = (signal: CallSignal) => {
      if (!signal) return;
      if (signal.type === 'CALL_OFFER') {
        const ringing = incomingCallSignalRef.current;
        if (ringing && ringing.callerId === signal.callerId) {
          // same call delivered twice (live + replay): just keep the richer candidate list
          if ((signal.candidates?.length || 0) > incomingCandidatesRef.current.length) {
            incomingCandidatesRef.current = [...(signal.candidates || [])];
          }
          return;
        }
        if (activeCallRef.current || ringing) {
          wsService.send('/app/call.signal', {
            type: 'CALL_BUSY',
            callType: signal.callType,
            targetUserId: signal.callerId,
            targetUsername: signal.callerUsername,
          });
          return;
        }
        incomingCandidatesRef.current = [...(signal.candidates || [])];
        setIncomingCallSignal(signal);
      } else if (signal.type === 'ICE_CANDIDATE' && incomingCallSignalRef.current && !activeCallRef.current) {
        // The phone is still ringing: keep the caller's network candidates for when the call is answered
        incomingCandidatesRef.current.push(signal.candidate);
      } else {
        setActiveSignal(signal);
        if (signal.type === 'CALL_REJECT') {
          showToast('Call was declined', 'info');
        } else if (signal.type === 'CALL_BUSY') {
          showToast('User is currently on another call', 'warning');
        }

        if ((signal.type === 'CALL_END' || signal.type === 'CALL_REJECT') && incomingCallSignalRef.current) {
          sound.stopRingtone();
          const inc = incomingCallSignalRef.current;
          addCallRecord({
            peerUser: {
              id: inc.callerId,
              username: inc.callerUsername,
              displayName: inc.callerName || inc.callerUsername,
            },
            type: inc.callType,
            direction: 'missed',
          });
          setIncomingCallSignal(null);
          incomingCandidatesRef.current = [];
        }
      }
    };
    handleCallSignalRef.current = handleCallSignal;

    const unsubs: Array<() => void> = [
      // 1. Personal queue for incoming messages
      wsService.subscribe('/user/queue/messages', (incomingMsg: Message) => {
        handleIncomingMessage(incomingMsg);
      }),

      // 2. Contact notifications
      wsService.subscribe('/user/queue/notifications', () => {
        loadContacts();
        loadPendingRequests();
        loadConversations();
      }),

      // 2b. Delivery / read receipts for messages I sent (works even when that chat isn't open)
      wsService.subscribe('/user/queue/receipts', (receipt: { conversationId: number; messageId?: number | null; status: 'DELIVERED' | 'READ'; updatedByUserId: number }) => {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === receipt.conversationId &&
            c.lastMessageSenderId != null &&
            String(c.lastMessageSenderId) === String(currentUser.id)
              ? { ...c, lastMessageStatus: maxStatus(c.lastMessageStatus ?? undefined, receipt.status) }
              : c
          )
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.conversationId === receipt.conversationId &&
            m.sender?.id === currentUser.id &&
            (receipt.messageId == null || m.id === receipt.messageId)
              ? { ...m, status: maxStatus(m.status, receipt.status) }
              : m
          )
        );
      }),

      // 3. Global presence channel
      wsService.subscribe('/topic/presence', (presence: PresenceNotification) => {
        handlePresenceUpdate(presence);
      }),

      // 4. + 5. WebRTC signalling
      wsService.subscribe(`/topic/calls/${currentUser.id}`, (signal: CallSignal) => handleCallSignal(signal)),
      wsService.subscribe('/user/queue/call', (signal: CallSignal) => handleCallSignal(signal)),
    ];

    wsService.connect();

    return () => {
      unsubConn();
      unsubs.forEach((u) => u());
      wsService.disconnect();
    };
  }, [currentUser]);

  // When active conversation changes, load messages & subscribe to conversation topic
  useEffect(() => {
    if (!activeConversation || !currentUser) return;

    // Load message history
    api
      .getMessages(activeConversation.id)
      .then((res) => {
        const sorted = [...res.content].reverse();
        setMessages(withOutbox(activeConversation.id, sorted));
        if (isForegroundNow()) {
          api.markAsRead(activeConversation.id).catch(() => {});
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversation.id ? { ...c, unreadCount: 0 } : c))
          );
          clearNotifications(`conv-${activeConversation.id}`);
        }
      })
      .catch((err) => {
        console.error('Error fetching messages:', err);
        showToast('Failed to load message history', 'error');
      });

    // Subscribe to conversation messages
    const unsubMessages = wsService.subscribe(
      `/topic/conversations/${activeConversation.id}`,
      (incomingMsg: Message) => {
        const same = (m: Message) =>
          m.id === incomingMsg.id ||
          (!!incomingMsg.clientMessageId && m.clientMessageId === incomingMsg.clientMessageId);
        setMessages((prev) => {
          if (prev.some(same)) {
            return prev.map((m) =>
              same(m)
                ? {
                    ...incomingMsg,
                    // keep client-only enrichment and never move ticks backwards
                    poll: m.poll ?? incomingMsg.poll,
                    locationData: m.locationData ?? incomingMsg.locationData,
                    messageType: m.messageType === 'LOCATION' || m.messageType === 'POLL' ? m.messageType : incomingMsg.messageType,
                    status: maxStatus(m.status, incomingMsg.status),
                  }
                : m
            );
          }
          return [...prev, incomingMsg];
        });

        // Only mark as read while the user is really looking at the chat (like WhatsApp)
        if (incomingMsg.sender.id !== currentUser.id && isForegroundNow()) {
          api.markAsRead(activeConversation.id).catch(() => {});
        }
      }
    );

    // Subscribe to typing indicators
    const unsubTyping = wsService.subscribe(
      `/topic/conversations/${activeConversation.id}/typing`,
      (typing: TypingNotification) => {
        if (typing.userId !== currentUser.id) {
          setIsOtherUserTyping(typing.isTyping);
          if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
          if (typing.isTyping) {
            typingTimerRef.current = setTimeout(() => setIsOtherUserTyping(false), 3000);
          }
        }
      }
    );

    // Subscribe to read receipts
    const unsubReceipts = wsService.subscribe(
      `/topic/conversations/${activeConversation.id}/receipts`,
      (receipt: { conversationId: number; status: 'READ'; updatedByUserId: number }) => {
        // Direct chats only: in groups, blue ticks arrive per message once everybody has read it
        if (receipt.updatedByUserId !== currentUser.id && activeConversation.type === 'DIRECT') {
          setMessages((prev) =>
            prev.map((m) =>
              m.sender?.id === currentUser.id ||
              String(m.sender?.id) === String(currentUser.id) ||
              (currentUser.username && m.sender?.username && m.sender.username.toLowerCase() === currentUser.username.toLowerCase())
                ? { ...m, status: 'READ' }
                : m
            )
          );
        }
      }
    );

    return () => {
      unsubMessages();
      unsubTyping();
      unsubReceipts();
      setIsOtherUserTyping(false);
    };
  }, [activeConversation?.id, currentUser?.id]);

  // After a dropped connection comes back, resync the open chat (missed messages + tick states)
  const wasConnectedRef = useRef(true);
  useEffect(() => {
    if (isConnected && !wasConnectedRef.current && currentUser) {
      loadConversations();
      if (activeConversation) {
        api.getMessages(activeConversation.id).then((res) => setMessages(withOutbox(activeConversation.id, [...res.content].reverse()))).catch(() => {});
      }
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected]);

  /** Keeps messages that are still waiting to be sent (clock icon) when history is reloaded. */
  const withOutbox = (convId: number, list: Message[]): Message[] => {
    const waiting = outboxRef.current
      .filter((o) => o.convId === convId && !list.some((m) => m.clientMessageId === o.optimistic.clientMessageId))
      .map((o) => o.optimistic);
    return waiting.length ? [...list, ...waiting] : list;
  };

  // ---- Foreground tracking, notifications, badge, deep links ----
  const handleCallSignalRef = useRef<((s: CallSignal) => void) | null>(null);

  const reportForeground = () => {
    wsService.send('/app/presence.foreground', { foreground: isForegroundNow() });
  };

  /** A call that rang while the app was closed: pick it up now (the server keeps it ringing for ~45 s). */
  const checkPendingCall = () => {
    if (activeCallRef.current || incomingCallSignalRef.current) return;
    api
      .getPendingCall()
      .then((offer) => {
        if (offer && offer.type === 'CALL_OFFER' && !activeCallRef.current && !incomingCallSignalRef.current) {
          handleCallSignalRef.current?.(offer);
        }
      })
      .catch(() => {});
  };

  const markActiveRead = () => {
    const conv = activeConversationRef.current;
    if (!conv || !isForegroundNow()) return;
    const listed = conversationsRef.current.find((c) => c.id === conv.id);
    if (listed && listed.unreadCount > 0) {
      api.markAsRead(conv.id).catch(() => {});
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)));
    }
    clearNotifications(`conv-${conv.id}`);
  };

  const deliverOutbox = async () => {
    if (flushingRef.current) return;
    flushingRef.current = true;
    try {
      while (outboxRef.current.length > 0) {
        const item = outboxRef.current[0];
        try {
          const sent = await api.sendMessage(item.data);
          outboxRef.current.shift();
          const cid = item.data.clientMessageId;
          setMessages((prev) =>
            prev.map((m) =>
              m.clientMessageId === cid
                ? {
                    ...sent,
                    poll: m.poll ?? sent.poll,
                    locationData: m.locationData ?? sent.locationData,
                    messageType: m.messageType === 'LOCATION' || m.messageType === 'POLL' ? m.messageType : sent.messageType,
                    status: maxStatus(m.status, sent.status),
                  }
                : m
            )
          );
          setConversations((prev) =>
            prev.map((c) =>
              c.id === item.convId
                ? {
                    ...c,
                    lastMessageAt: sent.createdAt,
                    lastMessageId: sent.id,
                    lastMessageSenderId: currentUser?.id ?? null,
                    lastMessageStatus: maxStatus(c.lastMessageStatus ?? undefined, sent.status) as Conversation['lastMessageStatus'],
                  }
                : c
            )
          );
        } catch (err: any) {
          const status = err instanceof ApiError ? err.status : 0;
          const permanent = status >= 400 && status < 500;
          item.attempts += status === 0 ? 0 : 1;
          if (permanent || item.attempts >= 5) {
            outboxRef.current.shift();
            const cid = item.data.clientMessageId;
            setMessages((prev) => prev.filter((m) => m.clientMessageId !== cid));
            showToast(err?.message || 'Failed to send message', 'error');
            continue;
          }
          break; // offline / server waking up: keep the clock icon and retry later
        }
      }
    } finally {
      flushingRef.current = false;
    }
  };

  // Tell the server whether the app is on screen (decides push vs. no push), mark chats read on return,
  // resync after the phone slept, and retry unsent messages.
  useEffect(() => {
    if (!currentUser) return;
    const onVisibility = () => {
      reportForeground();
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      wsService.ensureConnected();
      markActiveRead();
      void deliverOutbox();
      checkPendingCall();
      if (hiddenAtRef.current && Date.now() - hiddenAtRef.current > 5000) {
        loadConversations();
        const conv = activeConversationRef.current;
        if (conv) {
          api
            .getMessages(conv.id)
            .then((res) => setMessages(withOutbox(conv.id, [...res.content].reverse())))
            .catch(() => {});
        }
      }
      hiddenAtRef.current = null;
    };
    const onFocus = () => {
      reportForeground();
      markActiveRead();
    };
    const onOnline = () => {
      wsService.ensureConnected();
      void deliverOutbox();
    };
    const onPageHide = () => wsService.send('/app/presence.foreground', { foreground: false });

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', reportForeground);
    window.addEventListener('online', onOnline);
    window.addEventListener('pagehide', onPageHide);
    const retry = setInterval(() => {
      if (outboxRef.current.length > 0) void deliverOutbox();
    }, 8000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', reportForeground);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('pagehide', onPageHide);
      clearInterval(retry);
    };
  }, [currentUser?.id]);

  // Web Push: ask for permission on the first tap after sign-in, then subscribe this device
  useEffect(() => {
    if (!currentUser) return;
    const cleanup = requestPushPermissionOnFirstGesture();
    // keep server-side mute state (used to silence push) in sync with the chat list
    try {
      (JSON.parse(localStorage.getItem('cn_muted_conv_ids') || '[]') as number[]).forEach((id) =>
        api.setConversationMuted(id, true).catch(() => {})
      );
    } catch {
      // ignore
    }
    return cleanup;
  }, [currentUser?.id]);

  // Unread badge on the app icon + tab title
  useEffect(() => {
    const total = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
    document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;
    setAppBadge(total);
  }, [conversations]);

  // Opening a chat / call from a notification tap
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c');
    if (c) {
      pendingOpenConvRef.current = Number(c);
      params.delete('c');
      params.delete('call');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'open-conversation' && e.data.conversationId) {
        pendingOpenConvRef.current = Number(e.data.conversationId);
        openPendingConversation();
      } else if (e.data?.type === 'check-call') {
        checkPendingCall();
      }
    };
    navigator.serviceWorker?.addEventListener('message', onSwMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onSwMessage);
  }, []);

  const openPendingConversation = () => {
    const id = pendingOpenConvRef.current;
    if (!id) return;
    const conv = conversationsRef.current.find((c) => c.id === id);
    if (!conv) return; // conversations not loaded yet; retried when they load
    pendingOpenConvRef.current = null;
    if (isLockedConv(id)) {
      showToast('That chat is locked. Unlock it to read the message.', 'info');
      return;
    }
    setActiveConversation(conv);
  };

  useEffect(() => {
    if (pendingOpenConvRef.current) openPendingConversation();
  }, [conversations]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await api.getContacts();
      setContacts(data);
    } catch (err) {
      console.error('Error loading contacts:', err);
    }
  };

  const loadPendingRequests = async () => {
    try {
      const data = await api.getPendingReceivedRequests();
      setPendingRequests(data);
    } catch (err) {
      console.error('Error loading pending requests:', err);
    }
  };

  const loadBlockedUsers = async () => {
    try {
      const data = await api.getBlockedUsers();
      setBlockedUsers(data);
    } catch {
      // ignore
    }
  };

  const handleIncomingMessage = (msg: Message) => {
    // WebSocket callbacks live long: read the latest state through refs, not closed-over values
    const isActive = activeConversationRef.current?.id === msg.conversationId;
    const watching = isActive && isForegroundNow();
    if (!isMutedConv(msg.conversationId)) {
      sound.playReceiveSound();
    }
    setConversations((prev) => {
      const convIndex = prev.findIndex((c) => c.id === msg.conversationId);
      if (convIndex !== -1) {
        const updated = [...prev];
        const conv = { ...updated[convIndex] };
        conv.lastMessagePreview = msg.content || (msg.messageType === 'IMAGE' ? '📷 Photo' : '📎 Attachment');
        conv.lastMessageAt = msg.createdAt;
        if (!watching) {
          conv.unreadCount += 1;
        }
        updated.splice(convIndex, 1);
        return [conv, ...updated];
      } else {
        loadConversations();
        return prev;
      }
    });
  };

  const handlePresenceUpdate = (presence: PresenceNotification) => {
    setContacts((prev) =>
      prev.map((c) =>
        c.id === presence.userId ? { ...c, online: presence.isOnline, lastSeenAt: presence.lastSeenAt } : c
      )
    );

    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.otherParticipant && conv.otherParticipant.id === presence.userId) {
          return {
            ...conv,
            otherParticipant: {
              ...conv.otherParticipant,
              online: presence.isOnline,
              lastSeenAt: presence.lastSeenAt,
            },
          };
        }
        return conv;
      })
    );

    if (activeConversation?.otherParticipant?.id === presence.userId) {
      setActiveConversation((prev) => {
        if (!prev || !prev.otherParticipant) return prev;
        return {
          ...prev,
          otherParticipant: {
            ...prev.otherParticipant,
            online: presence.isOnline,
            lastSeenAt: presence.lastSeenAt,
          },
        };
      });
    }
  };

  const handleSendMessage = async (
    content: string,
    replyToMessageId?: number,
    media?: { url: string; fileName: string; fileSize: number; type: 'IMAGE' | 'FILE' | 'VOICE' | 'POLL' | 'LOCATION' },
    poll?: PollData,
    locationData?: SharedLocation
  ) => {
    if (!activeConversation || !currentUser) return;

    const clientMessageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const text = content || (locationData ? `📍 ${locationData.name}` : '');
    const uiType = (locationData ? 'LOCATION' : poll ? 'POLL' : media ? media.type : 'TEXT') as Message['messageType'];
    const nowIso = new Date().toISOString();
    const replied = replyToMessageId ? messages.find((m) => m.id === replyToMessageId) : undefined;

    // Show the message instantly with a clock icon, exactly like WhatsApp
    const optimistic: Message = {
      id: -Date.now(),
      conversationId: activeConversation.id,
      sender: currentUser,
      clientMessageId,
      content: text,
      messageType: uiType,
      status: 'PENDING',
      mediaUrl: media?.url,
      mediaFileName: media?.fileName,
      mediaFileSize: media?.fileSize,
      poll,
      locationData,
      edited: false,
      deletedForEveryone: false,
      replyToMessageId,
      replyToContent: replied?.content,
      replyToSenderName: replied?.sender?.displayName,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setMessages((prev) => [...prev, optimistic]);

    const preview = locationData
      ? `📍 ${locationData.name}`
      : content || (media?.type === 'IMAGE' ? '📷 Photo' : '📎 Attachment');
    setConversations((prev) => {
      const index = prev.findIndex((c) => c.id === activeConversation.id);
      if (index === -1) return prev;
      const list = [...prev];
      list[index] = { ...list[index], lastMessagePreview: preview, lastMessageAt: nowIso };
      const [moved] = list.splice(index, 1);
      return [moved, ...list];
    });

    outboxRef.current.push({
      convId: activeConversation.id,
      optimistic,
      attempts: 0,
      data: {
        conversationId: activeConversation.id,
        content: text,
        clientMessageId,
        replyToMessageId,
        mediaUrl: media?.url,
        mediaFileName: media?.fileName,
        mediaFileSize: media?.fileSize,
        messageType: toServerType(uiType) as any,
      },
    });
    void deliverOutbox();
  };

  const handleSendTyping = (isTyping: boolean) => {
    if (!activeConversation) return;
    wsService.send('/app/chat.typing', {
      conversationId: activeConversation.id,
      isTyping,
    });
  };

  const handleEditMessage = async (messageId: number, content: string) => {
    try {
      await api.editMessage(messageId, content);
      showToast('Message updated', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to edit message', 'error');
    }
  };

  const handleDeleteForMe = async (messageId: number) => {
    try {
      await api.deleteMessage(messageId, false);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      showToast('Deleted for you', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete message', 'error');
    }
  };

  const handleDeleteForEveryone = async (messageId: number) => {
    try {
      await api.deleteMessage(messageId, true);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deletedForEveryone: true, content: 'This message was deleted' }
            : m
        )
      );
      showToast('Message deleted for everyone', 'info');
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, deletedForEveryone: true, content: 'This message was deleted' }
            : m
        )
      );
      showToast('Message deleted for everyone', 'info');
    }
  };

  const handleDeleteConversation = async (convId: number) => {
    const snapshot = conversations;
    // optimistic UI, rolled back if the server refuses so it never "comes back" unexpectedly
    setConversations((prev) => prev.filter((c) => c.id !== convId));
    if (activeConversation?.id === convId) {
      setActiveConversation(null);
      setMessages([]);
    }
    try {
      await api.deleteConversation(convId);
      showToast('Chat deleted', 'info');
    } catch (err: any) {
      setConversations(snapshot);
      showToast(err.message || 'Could not delete chat', 'error');
    }
  };

  const handleClearConversationById = async (convId: number) => {
    if (activeConversation?.id === convId) {
      setMessages([]);
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, lastMessagePreview: 'Chat cleared', unreadCount: 0 }
          : c
      )
    );
    try {
      await api.clearConversation(convId);
    } catch (e) {
      console.warn('Backend clear conversation error (local clear applied):', e);
    }
    showToast('Conversation messages cleared', 'success');
  };

  const handleClearAllChats = async () => {
    setMessages([]);
    setConversations((prev) =>
      prev.map((c) => ({ ...c, lastMessagePreview: 'Chat cleared', unreadCount: 0 }))
    );
    for (const c of conversations) {
      api.clearConversation(c.id).catch(() => {});
    }
    showToast('All message history cleared', 'success');
  };

  const handleDeleteContact = (contactId: number) => {
    setContacts((prev) => prev.filter((c) => c.id !== contactId));
    showToast('Contact removed from directory', 'info');
  };

  const handleOpenDirectChatWithContact = async (contact: User) => {
    try {
      const conv = await api.getOrCreateDirectConversation(contact.id);
      setActiveConversation(conv);
      loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Failed to open chat', 'error');
    }
  };

  const handleCreateGroup = async (title: string, description: string, memberIds: number[]) => {
    try {
      const newGroup = await api.createGroup(title, description, memberIds);
      showToast(`Group "${title}" created successfully!`, 'success');
      loadConversations();
      setActiveConversation(newGroup);
    } catch (err: any) {
      showToast(err.message || 'Failed to create group', 'error');
      throw err;
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await api.acceptContactRequest(requestId);
      showToast('Contact request accepted!', 'success');
      loadPendingRequests();
      loadContacts();
      loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Failed to accept request', 'error');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await api.rejectContactRequest(requestId);
      showToast('Contact request declined', 'info');
      loadPendingRequests();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request', 'error');
    }
  };

  const handleToggleBlock = async (userId: number) => {
    const isCurrentlyBlocked = blockedUsers.some((u) => u.id === userId);
    try {
      if (isCurrentlyBlocked) {
        await api.unblockUser(userId);
        showToast('User unblocked', 'success');
      } else {
        await api.blockUser(userId);
        showToast('User blocked', 'info');
      }
      loadBlockedUsers();
      if (selectedProfileUser?.id === userId) {
        setSelectedProfileUser(null);
      }
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    }
  };

  const handleForwardMessage = async (targetConvId: number, msg: Message) => {
    const clientMessageId = `fwd-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    try {
      await api.sendMessage({
        conversationId: targetConvId,
        content: msg.content,
        clientMessageId,
        mediaUrl: msg.mediaUrl,
        mediaFileName: msg.mediaFileName,
        mediaFileSize: msg.mediaFileSize,
        messageType: toServerType(msg.messageType) as any,
      });

      showToast('Message forwarded successfully!', 'success');
      sound.playSendSound();
      loadConversations();
    } catch (err: any) {
      showToast(err.message || 'Failed to forward message', 'error');
    }
  };

  const handleVotePoll = (msgId: number, optionId: string) => {
    if (!currentUser) return;
    sound.playPopSound();

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId || !m.poll) return m;

        const userName = currentUser.displayName;
        const opts = m.poll.options.map((opt) => {
          if (opt.id === optionId) {
            const hasVoted = opt.votes.includes(userName);
            const newVotes = hasVoted
              ? opt.votes.filter((u) => u !== userName)
              : [...opt.votes, userName];
            return { ...opt, votes: newVotes };
          } else if (!m.poll!.allowMultiple) {
            // Remove user from other options if single-choice
            return { ...opt, votes: opt.votes.filter((u) => u !== userName) };
          }
          return opt;
        });

        const totalVotes = opts.reduce((acc, curr) => acc + curr.votes.length, 0);
        return {
          ...m,
          poll: {
            ...m.poll,
            options: opts,
            totalVotes,
          },
        };
      })
    );
  };

  const handleStartCall = (type: 'audio' | 'video', peerUser: User) => {
    setActiveSignal(null);
    setIncomingCallSignal(null);
    addCallRecord({
      peerUser,
      type,
      direction: 'outgoing',
    });
    setActiveCall({
      type,
      peerUser,
      isIncoming: false,
      incomingOffer: null,
    });
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCallSignal) return;
    sound.stopRingtone();
    const callerUser: User = {
      id: incomingCallSignal.callerId,
      username: incomingCallSignal.callerUsername,
      displayName: incomingCallSignal.callerName || incomingCallSignal.callerUsername,
    };
    addCallRecord({
      peerUser: callerUser,
      type: incomingCallSignal.callType,
      direction: 'incoming',
    });
    setActiveCall({
      type: incomingCallSignal.callType,
      peerUser: callerUser,
      isIncoming: true,
      incomingOffer: { ...incomingCallSignal, candidates: incomingCandidatesRef.current },
    });
    setIncomingCallSignal(null);
    incomingCandidatesRef.current = [];
  };

  const handleDeclineIncomingCall = () => {
    if (!incomingCallSignal) return;
    sound.stopRingtone();
    const callerUser: User = {
      id: incomingCallSignal.callerId,
      username: incomingCallSignal.callerUsername,
      displayName: incomingCallSignal.callerName || incomingCallSignal.callerUsername,
    };
    addCallRecord({
      peerUser: callerUser,
      type: incomingCallSignal.callType,
      direction: 'missed',
    });
    wsService.send('/app/call.signal', {
      type: 'CALL_REJECT',
      callType: incomingCallSignal.callType,
      targetUserId: incomingCallSignal.callerId,
      targetUsername: incomingCallSignal.callerUsername,
    });
    setIncomingCallSignal(null);
    incomingCandidatesRef.current = [];
  };

  const handleSendCallSignal = (signal: Partial<CallSignal>) => {
    wsService.send('/app/call.signal', signal);
  };

  const handleEndCall = () => {
    setActiveCall(null);
    setActiveSignal(null);
    setIncomingCallSignal(null);
    sound.stopRingtone();
    showToast('Call ended', 'info');
  };

  const handleLogout = () => {
    // stop alerts for this account on this device
    void disablePush();
    setAuthToken(null);
    setCurrentUser(null);
    setActiveConversation(null);
    setConversations([]);
    setMessages([]);
    wsService.disconnect();
    showToast('Logged out securely', 'info');
  };

  // Opened from a PC's QR with the phone's camera app: /?link=CN-XXXX-XXXX
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('link');
    if (fromUrl) {
      sessionStorage.setItem('cn_pending_link', fromUrl);
      params.delete('link');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const pending = sessionStorage.getItem('cn_pending_link');
    if (pending) {
      sessionStorage.removeItem('cn_pending_link');
      setIncomingLinkCode(pending);
      setShowLinkedDevicesModal(true);
    }
  }, [currentUser]);

  if (bootFailed && bootAutoRetries >= MAX_BOOT_RETRIES) {
    return (
      <div className="chat-splash" style={{ height: '100dvh', background: 'var(--bg-primary)', padding: 24, textAlign: 'center' }}>
        <div className="splash-icon-circle">
          <WifiOff size={34} />
        </div>
        <h2 style={{ fontSize: '18px' }}>Can't reach the server</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: 320, fontSize: 14, lineHeight: 1.5 }}>
          The server may be waking up. You are still signed in — nothing was lost.
        </p>
        <button className="form-btn-primary" style={{ marginTop: 12, width: 'auto', padding: '10px 28px' }} onClick={() => {
            setBootAutoRetries(0);
            setBootAttempt((n) => n + 1);
          }}>
          Try again
        </button>
      </div>
    );
  }

  if (loadingInitial || bootFailed) {
    return (
      <div className="chat-splash" style={{ height: '100vh', background: 'var(--bg-primary)' }}>
        <Logo size={64} className="boot-logo" />
        <h2 style={{ fontSize: '17px' }}>{bootFailed ? 'Waking up the server…' : 'Getting things ready…'}</h2>
        <div className="boot-bar"><i /></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }



  const appContent = (
    <div className="app-layout">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Connection Offline Banner */}
      {!isConnected && (
        <div className="reconnect-pill" role="status">
          <WifiOff size={14} /> Reconnecting…
        </div>
      )}

      {/* Sidebar Panel */}
      <Sidebar
        currentUser={currentUser}
        conversations={conversations}
        contacts={contacts}
        pendingRequests={pendingRequests}
        activeConversationId={activeConversation?.id || null}
        onSelectConversation={(conv) => setActiveConversation(conv)}
        onOpenDirectChatWithContact={handleOpenDirectChatWithContact}
        onAcceptRequest={handleAcceptRequest}
        onRejectRequest={handleRejectRequest}
        onOpenSearchModal={() => setShowSearchModal(true)}
        onOpenSettingsModal={() => setShowSettingsModal(true)}
        onOpenCreateGroupModal={() => setShowCreateGroupModal(true)}
        onOpenStarredModal={() => setShowStarredModal(true)}
        onOpenStoriesModal={() => setShowStoriesModal(true)}
        onOpenLinkedDevicesModal={() => setShowLinkedDevicesModal(true)}
        onOpenDownloadAppsModal={() => setShowDownloadAppsModal(true)}
        onToggleMobilePreview={() => setIsMobilePreview(!isMobilePreview)}
        isMobilePreviewActive={isMobilePreview}
        onToggleTheme={toggleTheme}
        isDarkTheme={isDarkTheme}
        onLogout={handleLogout}
        isMobileHidden={!!activeConversation}
        onNotify={showToast}
        onInitiateCall={(type, peerUser) => handleStartCall(type, peerUser)}
        starredMessages={starredMessages}
        onUnstarMessage={(id) => {
          unstarStoredMessage(id);
          showToast('Message unstarred', 'info');
        }}
        onDeleteConversation={handleDeleteConversation}
        onClearConversation={handleClearConversationById}
        onDeleteContact={handleDeleteContact}
      />

      {/* Main Conversation / Splash Area */}
      {activeConversation ? (
        <ChatArea
          conversation={activeConversation}
          currentUser={currentUser}
          contacts={contacts}
          messages={messages}
          isOtherUserTyping={isOtherUserTyping}
          onSendMessage={handleSendMessage}
          onSendTyping={handleSendTyping}
          onEditMessage={handleEditMessage}
          onDeleteForMe={handleDeleteForMe}
          onDeleteForEveryone={handleDeleteForEveryone}
          onForwardMessage={(msg) => setForwardingMessage(msg)}
          onVotePoll={handleVotePoll}
          onBackToSidebar={() => setActiveConversation(null)}
          onClearChat={() => activeConversation && handleClearConversationById(activeConversation.id)}
          onUpdateConversation={(updated) => {
            setActiveConversation((prev) => (prev ? { ...prev, ...updated } : null));
            setConversations((prev) =>
              prev.map((c) => (c.id === activeConversation.id ? { ...c, ...updated } : c))
            );
          }}
          onInitiateCall={(type) => {
            if (activeConversation.otherParticipant) {
              handleStartCall(type, activeConversation.otherParticipant);
            } else {
              showToast('Group conferencing starting...', 'info');
              handleStartCall(type, {
                id: 0,
                username: 'group',
                displayName: activeConversation.title,
              });
            }
          }}
          onViewProfile={() => {
            if (activeConversation.otherParticipant) {
              setSelectedProfileUser(activeConversation.otherParticipant);
            } else {
              showToast(`Group: ${activeConversation.title} (${activeConversation.members?.length || 2} members)`, 'info');
            }
          }}
          onNotify={showToast}
        />
      ) : (
        <div className="chat-splash-refined">
          <div className="splash-hero">
            <Logo size={76} className="splash-logo" />
            <h2>Your people, one tap away</h2>
            <p>
              Messages, voice notes, files and HD calls, in sync across your phone and computer.
            </p>
          </div>

          <div className="splash-features-grid">
            <div className="splash-feature-card">
              <span className="sf-ico sf-a"><Phone size={18} /></span>
              <div><b>HD calls</b><small>Voice and video with screen sharing.</small></div>
            </div>
            <div className="splash-feature-card">
              <span className="sf-ico sf-b"><Camera size={18} /></span>
              <div><b>24h stories</b><small>Share a moment that fades away.</small></div>
            </div>
            <div className="splash-feature-card">
              <span className="sf-ico sf-c"><Lock size={18} /></span>
              <div><b>Chat lock</b><small>Hide private chats behind a PIN.</small></div>
            </div>
            <div className="splash-feature-card">
              <span className="sf-ico sf-d"><Monitor size={18} /></span>
              <div><b>Phone + PC</b><small>Link a computer with a QR scan.</small></div>
            </div>
          </div>

          <div className="splash-actions">
            <button className="btn-primary" onClick={() => setShowCreateGroupModal(true)}>
              <Users size={16} /> New group
            </button>
            <button className="btn-secondary" onClick={() => setShowSearchModal(true)}>
              <Search size={15} /> Find people
            </button>
            <button className="btn-secondary" onClick={() => setShowLinkedDevicesModal(true)}>
              <Monitor size={15} /> Link a computer
            </button>
          </div>

          <div className="splash-foot">
            <Lock size={13} />
            <span>Private by design. Your chats stay between you and them.</span>
          </div>
        </div>
      )}

      {/* User Discovery Modal */}
      {showSearchModal && (
        <ContactSearchModal
          onClose={() => setShowSearchModal(false)}
          onSelectUserToChat={(userId) => {
            const target = { id: userId } as User;
            handleOpenDirectChatWithContact(target);
          }}
          onRequestSent={() => {
            loadPendingRequests();
            showToast('Connection request dispatched!', 'success');
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          currentUser={currentUser}
          onClose={() => setShowSettingsModal(false)}
          onProfileUpdated={(updated) => {
            setCurrentUser(updated);
            showToast('Profile updated successfully', 'success');
          }}
          onClearAllChats={handleClearAllChats}
          onLogout={handleLogout}
        />
      )}

      {/* Create Team Group Modal */}
      {showCreateGroupModal && (
        <CreateGroupModal
          contacts={contacts}
          onClose={() => setShowCreateGroupModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          message={forwardingMessage}
          conversations={conversations}
          onClose={() => setForwardingMessage(null)}
          onForward={handleForwardMessage}
        />
      )}

      {/* Starred Messages Modal */}
      {showStarredModal && (
        <StarredMessagesModal
          messages={starredMessages}
          onClose={() => setShowStarredModal(false)}
          onUnstar={(id) => {
            unstarStoredMessage(id);
            showToast('Message unstarred', 'info');
          }}
          onCopy={(content) => {
            navigator.clipboard.writeText(content);
            showToast('Copied to clipboard', 'success');
          }}
        />
      )}

      {/* Corporate Status & Stories Modal */}
      {showStoriesModal && (
        <StatusStoriesModal
          currentUser={currentUser}
          contacts={contacts}
          onClose={() => setShowStoriesModal(false)}
        />
      )}

      {/* Linked Devices & WhatsApp Web Modal */}
      {showLinkedDevicesModal && (
        <LinkedDevicesModal
          currentUser={currentUser || undefined}
          initialCode={incomingLinkCode}
          onClose={() => { setShowLinkedDevicesModal(false); setIncomingLinkCode(null); }}
          onNotify={showToast}
        />
      )}

      {/* Download & Install Cross-Platform Apps (Mac, Windows, iOS, Android) */}
      {showDownloadAppsModal && (
        <DownloadAppsModal
          onClose={() => setShowDownloadAppsModal(false)}
          onOpenLinkedDevices={() => setShowLinkedDevicesModal(true)}
          onNotify={showToast}
        />
      )}

      {/* User Profile Details Drawer / Modal */}
      {selectedProfileUser && (
        <UserProfileModal
          user={selectedProfileUser}
          isBlocked={blockedUsers.some((u) => u.id === selectedProfileUser.id)}
          onClose={() => setSelectedProfileUser(null)}
          onStartChat={() => {
            handleOpenDirectChatWithContact(selectedProfileUser);
            setSelectedProfileUser(null);
          }}
          onAudioCall={() => {
            handleStartCall('audio', selectedProfileUser);
            setSelectedProfileUser(null);
          }}
          onVideoCall={() => {
            handleStartCall('video', selectedProfileUser);
            setSelectedProfileUser(null);
          }}
          onToggleBlock={() => handleToggleBlock(selectedProfileUser.id)}
        />
      )}

      {/* Incoming Call Ringing Dialog */}
      {incomingCallSignal && (
        <IncomingCallModal
          signal={incomingCallSignal}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Interactive HD Corporate Call Modal */}
      {activeCall && currentUser && (
        <VideoCallModal
          currentUser={currentUser}
          peerUser={activeCall.peerUser}
          callType={activeCall.type}
          isIncoming={activeCall.isIncoming}
          incomingOffer={activeCall.incomingOffer}
          onSendSignal={handleSendCallSignal}
          activeSignal={activeSignal}
          onEndCall={handleEndCall}
        />
      )}
    </div>
  );

  if (isMobilePreview) {
    return (
      <div className="mobile-preview-backdrop">
        <div className="mobile-preview-badge">
          <span>📱 Mobile App View (iPhone / Android)</span>
          <button onClick={() => setIsMobilePreview(false)}>Switch to Desktop</button>
        </div>
        <div className="mobile-device-shell">
          <div className="mobile-dynamic-island" />
          <div className="mobile-status-bar">
            <span>9:41</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
          {appContent}
          <div className="mobile-home-indicator" />
        </div>
      </div>
    );
  }

  return appContent;
};

export default App;
