import type { Message } from '../types';

const STORAGE_KEY = 'cn_starred_messages_v1';

export function getStoredStarredMessages(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse starred messages:', err);
    return [];
  }
}

export function saveStoredStarredMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    window.dispatchEvent(new CustomEvent('starred:updated', { detail: messages }));
  } catch (err) {
    console.error('Failed to save starred messages:', err);
  }
}

export function toggleStoredStarredMessage(message: Message): boolean {
  const current = getStoredStarredMessages();
  const exists = current.some((m) => m.id === message.id);
  let updated: Message[];

  if (exists) {
    updated = current.filter((m) => m.id !== message.id);
  } else {
    // Add marked as starred
    updated = [{ ...message, isStarred: true }, ...current];
  }

  saveStoredStarredMessages(updated);
  return !exists;
}

export function unstarStoredMessage(messageId: number): void {
  const current = getStoredStarredMessages();
  const updated = current.filter((m) => m.id !== messageId);
  saveStoredStarredMessages(updated);
}

export function isStoredMessageStarred(messageId: number): boolean {
  const current = getStoredStarredMessages();
  return current.some((m) => m.id === messageId);
}

export function subscribeToStarredUpdates(
  callback: (messages: Message[]) => void
): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<Message[]>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getStoredStarredMessages());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredStarredMessages());
    }
  };

  window.addEventListener('starred:updated', handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('starred:updated', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
