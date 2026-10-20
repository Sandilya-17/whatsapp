import type { StatusStory } from '../types';

const STORAGE_KEY = 'connectnow_stories';

export const getStoredStories = (): StatusStory[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out any previous mock stories
    return parsed.filter(
      (s: StatusStory) => s && s.id && !['story-1', 'story-2', 'story-3'].includes(s.id)
    );
  } catch {
    return [];
  }
};

export const saveStoredStories = (stories: StatusStory[]): void => {
  if (typeof window === 'undefined') return;
  try {
    const clean = stories.filter(
      (s) => s && s.id && !['story-1', 'story-2', 'story-3'].includes(s.id)
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    window.dispatchEvent(new CustomEvent('status:updated'));
  } catch {
    // ignore
  }
};

export const addStoredStory = (story: StatusStory): StatusStory[] => {
  const current = getStoredStories();
  const updated = [story, ...current];
  saveStoredStories(updated);
  return updated;
};

export const deleteStoredStory = (storyId: string): StatusStory[] => {
  const current = getStoredStories();
  const updated = current.filter((s) => s.id !== storyId);
  saveStoredStories(updated);
  return updated;
};

export const subscribeToStatusUpdates = (callback: () => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener('status:updated', handler);
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) callback();
  });
  return () => {
    window.removeEventListener('status:updated', handler);
  };
};
