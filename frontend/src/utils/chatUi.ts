// Shared helpers for WhatsApp-style chat UI: day labels and per-chat drafts.
// Drafts are per-viewer conveniences, so they live in localStorage and every
// access is wrapped so private windows / blocked storage never break the chat.

const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (d: Date): number =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "Today", "Yesterday", a weekday within the last week, otherwise a full date. */
export const dayLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' });
};

const draftKey = (conversationId: number) => `cn_draft_${conversationId}`;

export const readDraft = (conversationId: number): string => {
  try {
    return localStorage.getItem(draftKey(conversationId)) || '';
  } catch {
    return '';
  }
};

export const writeDraft = (conversationId: number, text: string): void => {
  try {
    if (text.trim()) {
      localStorage.setItem(draftKey(conversationId), text);
    } else {
      localStorage.removeItem(draftKey(conversationId));
    }
  } catch {
    /* storage unavailable: drafts are a convenience, not required */
  }
};
