export interface User {
  id: number;
  username: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  statusMessage?: string;
  online?: boolean;
  lastSeenAt?: string;
  department?: string;
  role?: string;
  privacySettings?: {
    profilePhotoVisibility: string;
    lastSeenVisibility: string;
    readReceiptsEnabled: boolean;
    allowGroupInvitesFromEveryone: boolean;
  };
}

export interface Conversation {
  id: number;
  type: 'DIRECT' | 'GROUP';
  title: string;
  avatarUrl?: string;
  description?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  /** Newest message in the chat, its sender, and its delivery status (drives chat-list ticks). */
  lastMessageId?: number | null;
  lastMessageSenderId?: number | null;
  lastMessageStatus?: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | null;
  unreadCount: number;
  isPinned?: boolean;
  isArchived?: boolean;
  isMuted?: boolean;
  isMarkedUnread?: boolean;
  isLocked?: boolean;
  lockPin?: string;
  pinnedMessageId?: number;
  disappearingTimer?: 'off' | '24h' | '7d' | '90d';
  otherParticipant?: User;
  members: User[];
  adminIds?: number[];
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface PollOption {
  id: string;
  text: string;
  votes: string[];
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple?: boolean;
  totalVotes: number;
}

export interface SharedLocation {
  latitude: number;
  longitude: number;
  name: string;
  address?: string;
  isLive?: boolean;
}

export interface Message {
  id: number;
  conversationId: number;
  sender: User;
  clientMessageId?: string;
  content: string;
  messageType: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM' | 'POLL' | 'LOCATION';
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ';
  mediaUrl?: string;
  mediaFileName?: string;
  mediaFileSize?: number;
  locationData?: SharedLocation;
  edited: boolean;
  deletedForEveryone: boolean;
  isStarred?: boolean;
  isPinned?: boolean;
  isForwarded?: boolean;
  poll?: PollData;
  reactions?: MessageReaction[];
  replyToMessageId?: number;
  replyToContent?: string;
  replyToSenderName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedDevice {
  id: string;
  deviceType: 'windows' | 'mac' | 'browser' | 'linux' | 'smartphone' | 'ios' | 'android';
  deviceName: string;
  browserOrClient: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface StatusUpdate {
  id: string;
  userId: number;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  type: 'text' | 'image';
  content: string;
  bgColor?: string;
  caption?: string;
  viewersCount?: number;
  isViewed?: boolean;
}

export interface ContactRequest {
  id: number;
  sender: User;
  recipient: User;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

export interface UserSearchResult {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
  statusMessage?: string;
  relationshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED' | 'BLOCKED';
}

export interface TypingNotification {
  conversationId: number;
  userId: number;
  username: string;
  isTyping: boolean;
}

export interface PresenceNotification {
  userId: number;
  username: string;
  isOnline: boolean;
  lastSeenAt?: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export interface CallRecord {
  id: string;
  peerUser: User;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

export interface CallSignal {
  type: 'CALL_OFFER' | 'CALL_ANSWER' | 'ICE_CANDIDATE' | 'CALL_REJECT' | 'CALL_END' | 'CALL_BUSY';
  callType: 'audio' | 'video';
  callerId: number;
  callerUsername: string;
  callerName: string;
  targetUserId: number;
  targetUsername?: string;
  conversationId?: number;
  sdp?: any;
  candidate?: any;
  candidates?: any[];
}

export interface StatusStory {
  id: string;
  user: User;
  content: string;
  mediaUrl?: string;
  backgroundGradient: string;
  createdAt: string;
  views: number;
}
