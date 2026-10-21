import type { StatusStory } from '../types';
import { api } from '../services/api';

// Status stories live on the server (so everyone's contacts can see them).
// This module keeps an in-memory copy and refreshes it from the backend.

let cache: StatusStory[] = [];

const emitUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('status:updated'));
};

const timeAgo = (iso: string): string => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  const seconds = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

const normalize = (list: StatusStory[]): StatusStory[] =>
  list.map((s) => ({ ...s, createdAt: timeAgo(s.createdAt) }));

export const getStoredStories = (): StatusStory[] => cache;

export const refreshStories = async (): Promise<StatusStory[]> => {
  try {
    const list = await api.getStatuses();
    cache = normalize(Array.isArray(list) ? list : []);
    emitUpdate();
  } catch {
    // keep the previous list if the network call fails
  }
  return cache;
};

export const postStory = async (data: {
  content: string;
  mediaUrl?: string;
  backgroundGradient: string;
}): Promise<StatusStory[]> => {
  await api.postStatus(data);
  return refreshStories();
};

export const removeStory = async (storyId: string): Promise<StatusStory[]> => {
  await api.deleteStatus(storyId);
  return refreshStories();
};

export const subscribeToStatusUpdates = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('status:updated', callback);
  return () => {
    window.removeEventListener('status:updated', callback);
  };
};

// Loads statuses now, then keeps them fresh (every 20s and when the app comes back to the foreground).
export const startStatusSync = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  void refreshStories();
  const interval = window.setInterval(() => void refreshStories(), 20000);
  const onVisible = () => {
    if (document.visibilityState === 'visible') void refreshStories();
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    window.clearInterval(interval);
    document.removeEventListener('visibilitychange', onVisible);
  };
};
