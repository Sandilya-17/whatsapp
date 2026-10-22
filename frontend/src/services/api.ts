import type { User, Conversation, Message, ContactRequest, UserSearchResult, StatusStory } from '../types';

// Backend address. Empty = same site (local dev / docker). Set VITE_API_URL when the backend is hosted elsewhere (e.g. Render).
export const API_ORIGIN: string = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
const API_BASE = `${API_ORIGIN}/api`;

export function getAuthToken(): string | null {
  return localStorage.getItem('connectnow_token');
}

export function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('connectnow_token', token);
  } else {
    localStorage.removeItem('connectnow_token');
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Render's free tier sleeps and wakes slowly: retry network failures / gateway errors on safe (GET) calls instead of failing.
  const isGet = !options.method || options.method === 'GET';
  const maxAttempts = isGet ? 4 : 1;
  let response!: Response;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      if (isGet && [502, 503, 504].includes(response.status) && attempt < maxAttempts) {
        await sleep(1500 * attempt);
        continue;
      }
      break;
    } catch {
      if (attempt === maxAttempts) {
        throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
      }
      await sleep(1500 * attempt);
    }
  }

  // Sliding session: server hands back a fresh token as the old one ages
  const refreshed = response.headers.get('X-Refreshed-Token');
  if (refreshed) setAuthToken(refreshed);

  if (!response.ok) {
    // Only a 401 means the session is really gone. 403 is a permission error (e.g. "not a member") and must NOT log you out.
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      setAuthToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    let errorMsg = `Error ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.message) {
        errorMsg = errorData.message;
      } else if (errorData.validationErrors) {
        errorMsg = Object.values(errorData.validationErrors).join(', ');
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errorMsg, response.status);
  }

  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return {} as T;
}

export const api = {
  // Auth
  register: (data: { username: string; email: string; password: string; displayName: string }) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { usernameOrEmail: string; password: string }) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Device linking (QR login for PC / web)
  qrCreate: (deviceName: string) =>
    request<{ code: string; expiresInSeconds: number }>('/auth/qr/create', {
      method: 'POST',
      body: JSON.stringify({ deviceName }),
    }),
  qrStatus: (code: string) =>
    request<{ status: 'PENDING' | 'APPROVED' | 'EXPIRED'; token?: string; user?: User }>(
      `/auth/qr/status/${encodeURIComponent(code)}`
    ),
  linkDevice: (code: string) =>
    request<{ linked: boolean; deviceName: string }>('/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  // Users
  getCurrentUser: () => request<User>('/users/me'),
  updateProfile: (data: { displayName?: string; statusMessage?: string; avatarUrl?: string }) =>
    request<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updatePrivacy: (data: { profilePhotoVisibility?: string; lastSeenVisibility?: string; readReceiptsEnabled?: boolean }) =>
    request<User>('/users/me/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Contacts & Discovery
  searchUsers: (query: string) => request<UserSearchResult[]>(`/contacts/search?query=${encodeURIComponent(query)}`),
  sendContactRequest: (recipientId: number) =>
    request<ContactRequest>('/contacts/requests', {
      method: 'POST',
      body: JSON.stringify({ recipientId }),
    }),
  getPendingReceivedRequests: () => request<ContactRequest[]>('/contacts/requests/pending'),
  getPendingSentRequests: () => request<ContactRequest[]>('/contacts/requests/sent'),
  acceptContactRequest: (id: number) =>
    request<ContactRequest>(`/contacts/requests/${id}/accept`, {
      method: 'POST',
    }),
  rejectContactRequest: (id: number) =>
    request<{ message: string }>(`/contacts/requests/${id}/reject`, {
      method: 'POST',
    }),
  getContacts: () => request<User[]>('/contacts'),
  blockUser: (userId: number) =>
    request<{ message: string }>(`/contacts/block/${userId}`, {
      method: 'POST',
    }),
  unblockUser: (userId: number) =>
    request<{ message: string }>(`/contacts/unblock/${userId}`, {
      method: 'POST',
    }),
  getBlockedUsers: () => request<User[]>('/contacts/blocked'),

  // Conversations
  getConversations: () => request<Conversation[]>('/conversations'),
  getOrCreateDirectConversation: (targetUserId: number) =>
    request<Conversation>(`/conversations/direct/${targetUserId}`, {
      method: 'POST',
    }),
  deleteConversation: (id: number) =>
    request<{ message: string }>(`/conversations/${id}`, { method: 'DELETE' }),
  getConversation: (id: number) => request<Conversation>(`/conversations/${id}`),
  createGroup: (title: string, description: string, memberIds: number[]) =>
    request<Conversation>('/conversations/group', {
      method: 'POST',
      body: JSON.stringify({ title, description, memberIds }),
    }),

  // Messages
  getMessages: (conversationId: number, page = 0, size = 50) =>
    request<{ content: Message[]; totalElements: number; totalPages: number }>(
      `/messages/conversations/${conversationId}?page=${page}&size=${size}`
    ),
  sendMessage: (data: {
    conversationId: number;
    content: string;
    clientMessageId: string;
    messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'SYSTEM';
    mediaUrl?: string;
    mediaFileName?: string;
    mediaFileSize?: number;
    replyToMessageId?: number;
  }) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  // Push notifications / calls
  getPushPublicKey: () => request<{ publicKey: string }>('/push/public-key'),
  pushSubscribe: (data: { endpoint: string; p256dh: string; auth: string }) =>
    request<{ message: string }>('/push/subscribe', { method: 'POST', body: JSON.stringify(data) }),
  pushUnsubscribe: (endpoint: string) =>
    request<{ message: string }>('/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint }) }),
  setConversationMuted: (conversationId: number, muted: boolean) =>
    request<{ message: string }>('/push/mute', { method: 'POST', body: JSON.stringify({ conversationId, muted }) }),
  getPendingCall: async () => {
    const res = await request<any>('/calls/pending');
    return res && res.type ? (res as import('../types').CallSignal) : null;
  },
  markAsRead: (conversationId: number) =>
    request<{ message: string }>(`/messages/conversations/${conversationId}/read`, {
      method: 'POST',
    }),
  editMessage: (id: number, content: string) =>
    request<Message>(`/messages/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    }),
  deleteMessage: (id: number, forEveryone: boolean) =>
    request<{ message: string }>(`/messages/${id}?forEveryone=${forEveryone}`, {
      method: 'DELETE',
    }),
  clearConversation: (conversationId: number) =>
    request<{ message: string }>(`/messages/conversations/${conversationId}/clear`, {
      method: 'DELETE',
    }),

  // Status (24h stories)
  getStatuses: () => request<StatusStory[]>('/status'),
  postStatus: (data: { content: string; mediaUrl?: string; backgroundGradient: string }) =>
    request<StatusStory>('/status', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteStatus: (storyId: string) =>
    request<{ message: string }>(`/status/${storyId.replace('story-', '')}`, {
      method: 'DELETE',
    }),

  // Upload file
  uploadFile: async (file: File): Promise<{ fileUrl: string; fileName: string; fileSize: number; fileType: string }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      let msg = 'Failed to upload file';
      try {
        const data = await response.json();
        if (data.message) msg = data.message;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    const data = await response.json();
    // Uploaded files are served by the backend, so make their URL absolute when the backend is on another host.
    if (typeof data.fileUrl === 'string' && data.fileUrl.startsWith('/')) {
      data.fileUrl = `${API_ORIGIN}${data.fileUrl}`;
    }
    return data;
  },
};
