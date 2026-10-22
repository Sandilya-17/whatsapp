import type { LinkedDevice } from '../types';

/** What the PC encodes in its QR: a normal URL, so a phone's native camera can open it too. */
export const buildLinkUrl = (code: string) => `${window.location.origin}/?link=${encodeURIComponent(code)}`;

const CODE_RE = /CN-[A-Z2-9]{4}-[A-Z2-9]{4}/i;

/** Pull a pairing code out of a scanned QR payload or something the user typed/pasted. */
export const extractLinkCode = (raw: string): string | null => {
  if (!raw) return null;
  const m = raw.match(CODE_RE);
  return m ? m[0].toUpperCase() : null;
};

/** Friendly name of this browser/computer, sent to the server when asking for a QR. */
export const describeThisDevice = (): string => {
  const ua = navigator.userAgent;
  const os = /Windows/.test(ua) ? 'Windows' : /Mac OS X|Macintosh/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : 'Computer';
  const br = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} · ${br}`;
};

const KEY = 'cn_linked_devices';

export const loadLinkedDevices = (): LinkedDevice[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]') as LinkedDevice[];
    return parsed.filter((d) => d && !d.isCurrent && !/^dev-[123]$/.test(d.id));
  } catch {
    return [];
  }
};

export const saveLinkedDevices = (list: LinkedDevice[]) => {
  localStorage.setItem(KEY, JSON.stringify(list.filter((d) => !d.isCurrent)));
};
