import type { CallRecord, User } from '../types';

const STORAGE_KEY = 'cn_call_records_v1';

export function getStoredCallRecords(): CallRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse stored call records:', err);
    return [];
  }
}

export function saveStoredCallRecords(records: CallRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('call_logs:updated', { detail: records }));
  } catch (err) {
    console.error('Failed to save call records:', err);
  }
}

export function addCallRecord(data: {
  peerUser: User;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration?: string;
  timestamp?: string;
}): CallRecord {
  const records = getStoredCallRecords();
  const now = new Date();
  
  // Format readable timestamp: e.g. "Today, 7:45 PM"
  const formattedTime =
    data.timestamp ||
    `Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  const newRecord: CallRecord = {
    id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    peerUser: data.peerUser,
    type: data.type,
    direction: data.direction,
    timestamp: formattedTime,
    duration: data.duration,
  };

  // Keep latest 100 call records
  const updated = [newRecord, ...records].slice(0, 100);
  saveStoredCallRecords(updated);
  return newRecord;
}

export function deleteCallRecord(id: string): void {
  const records = getStoredCallRecords();
  const updated = records.filter((r) => r.id !== id);
  saveStoredCallRecords(updated);
}

export function clearAllCallRecords(): void {
  saveStoredCallRecords([]);
}

export function subscribeToCallLogUpdates(
  callback: (records: CallRecord[]) => void
): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<CallRecord[]>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getStoredCallRecords());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      callback(getStoredCallRecords());
    }
  };

  window.addEventListener('call_logs:updated', handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('call_logs:updated', handler);
    window.removeEventListener('storage', storageHandler);
  };
}
