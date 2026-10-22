import React, { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  X,
  ArrowLeft,
  Monitor,
  Laptop,
  Globe,
  Smartphone,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Zap,
  ScanLine,
  Keyboard,
  Link2,
} from 'lucide-react';
import type { LinkedDevice, User } from '../types';
import { api } from '../services/api';
import { sound } from '../utils/sound';
import { extractLinkCode, loadLinkedDevices, saveLinkedDevices } from '../utils/deviceLink';

interface LinkedDevicesModalProps {
  currentUser?: User;
  onClose: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  /** Set when the user opened a ?link=CODE URL (e.g. scanned with the phone's camera app). */
  initialCode?: string | null;
}

const describeThisPhone = (): string => {
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'This iPhone / iPad';
  if (/Android/.test(ua)) return 'This Android phone';
  if (/Windows/.test(ua)) return 'This Windows PC';
  if (/Mac/.test(ua)) return 'This Mac';
  return 'This device';
};

const guessType = (name: string): LinkedDevice['deviceType'] => {
  const n = name.toLowerCase();
  if (n.includes('windows')) return 'windows';
  if (n.includes('mac')) return 'mac';
  if (n.includes('android') || n.includes('ios')) return 'smartphone';
  return 'browser';
};

export const LinkedDevicesModal: React.FC<LinkedDevicesModalProps> = ({ onClose, onNotify, initialCode }) => {
  const [view, setView] = useState<'devices' | 'scanner' | 'confirm'>(initialCode ? 'confirm' : 'devices');
  const [devices, setDevices] = useState<LinkedDevice[]>(() => loadLinkedDevices());
  const [pendingCode, setPendingCode] = useState<string | null>(initialCode ?? null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [cameraOk, setCameraOk] = useState<boolean | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lockRef = useRef(false);

  useEffect(() => {
    saveLinkedDevices(devices);
  }, [devices]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  /** The real thing: tell the server to approve this code for my account. */
  const approve = useCallback(
    async (code: string) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      setErr(null);
      try {
        const res = await api.linkDevice(code);
        sound.playPopSound();
        navigator.vibrate?.([60, 40, 90]);
        stopCamera();
        const dev: LinkedDevice = {
          id: `dev-${Date.now()}`,
          deviceType: guessType(res.deviceName),
          deviceName: res.deviceName,
          browserOrClient: 'ConnectNow Web',
          location: 'Linked',
          lastActive: `Linked ${new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`,
          isCurrent: false,
        };
        setDevices((p) => [dev, ...p]);
        setDone(res.deviceName);
        onNotify?.(`${res.deviceName} is now linked`, 'success');
        setTimeout(() => {
          setDone(null);
          setPendingCode(null);
          setView('devices');
          lockRef.current = false;
        }, 1600);
      } catch (e: any) {
        setErr(e?.message || 'Could not link the device. Try a fresh code.');
        lockRef.current = false;
        if (view === 'scanner') setTimeout(() => setErr(null), 3500);
      } finally {
        setBusy(false);
      }
    },
    [onNotify, stopCamera, view]
  );

  const scanLoop = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (v && c && v.readyState >= 2 && !lockRef.current) {
      const w = v.videoWidth;
      const h = v.videoHeight;
      if (w && h) {
        const scale = Math.min(1, 640 / w);
        c.width = Math.round(w * scale);
        c.height = Math.round(h * scale);
        const ctx = c.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const img = ctx.getImageData(0, 0, c.width, c.height);
          const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
          const code = hit ? extractLinkCode(hit.data) : null;
          if (code) {
            approve(code);
            return;
          }
        }
      }
    }
    rafRef.current = requestAnimationFrame(scanLoop);
  }, [approve]);

  const startCamera = useCallback(
    async (mode: 'environment' | 'user') => {
      stopCamera();
      setTorch(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraOk(true);
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await v.play().catch(() => {});
        }
        rafRef.current = requestAnimationFrame(scanLoop);
      } catch {
        setCameraOk(false);
      }
    },
    [scanLoop, stopCamera]
  );

  useEffect(() => {
    if (view === 'scanner') {
      lockRef.current = false;
      startCamera(facing);
    } else {
      stopCamera();
    }
    return stopCamera;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  const flip = () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    startCamera(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    const caps = (track as any)?.getCapabilities?.();
    if (track && caps?.torch) {
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: !torch }] });
        setTorch(!torch);
      } catch {
        onNotify?.('Flash is not available on this camera', 'info');
      }
    } else {
      onNotify?.('Flash is not available on this camera', 'info');
    }
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = extractLinkCode(manual);
    if (!code) {
      setErr('That does not look like a code. It should be like CN-AB12-CD34.');
      return;
    }
    approve(code);
  };

  const removeDevice = (id: string, name: string) => {
    setDevices((p) => p.filter((d) => d.id !== id));
    onNotify?.(`${name} removed from this list`, 'info');
  };

  const icon = (t: LinkedDevice['deviceType']) =>
    t === 'windows' ? <Monitor size={20} /> : t === 'mac' ? <Laptop size={20} /> : t === 'browser' ? <Globe size={20} /> : <Smartphone size={20} />;

  const title = view === 'scanner' ? 'Scan the code' : view === 'confirm' ? 'Link this device?' : 'Linked devices';
  const sub =
    view === 'scanner' ? 'Point your camera at the QR on your computer' : view === 'confirm' ? 'Only continue if you opened this code yourself' : 'Use ConnectNow on your PC or Mac';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container linked-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header linked-head">
          <div className="linked-head-left">
            {view === 'scanner' ? (
              <button className="btn-icon" onClick={() => setView('devices')} aria-label="Back"><ArrowLeft size={18} /></button>
            ) : (
              <span className="linked-head-ico"><Monitor size={18} /></span>
            )}
            <div>
              <div className="linked-title">{title}</div>
              <div className="linked-sub">{sub}</div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        <div className="modal-body linked-body">
          {view === 'confirm' && pendingCode && (
            <div className="linked-confirm">
              <div className={`linked-confirm-ico ${done ? 'ok' : ''}`}>
                {done ? <CheckCircle2 size={40} /> : <Link2 size={36} />}
              </div>
              <h3>{done ? `${done} linked` : 'A computer is asking to sign in as you'}</h3>
              <p>
                {done
                  ? 'You can close this window.'
                  : 'If you scanned the QR on your own computer, approve it. If someone else sent you this link, cancel.'}
              </p>
              <div className="linked-code">{pendingCode}</div>
              {err && <div className="linked-error">{err}</div>}
              {!done && (
                <div className="linked-actions">
                  <button className="btn-secondary" onClick={() => { setPendingCode(null); setView('devices'); }}>Cancel</button>
                  <button className="btn-primary" disabled={busy} onClick={() => approve(pendingCode)}>
                    {busy ? 'Linking…' : 'Link device'}
                  </button>
                </div>
              )}
            </div>
          )}

          {view === 'scanner' && (
            <div className="scan-wrap">
              <div className="scan-stage">
                {cameraOk === false ? (
                  <div className="scan-denied">
                    <ScanLine size={30} />
                    <p>Camera is blocked or not available here. Allow camera access in your browser, or link with the code instead.</p>
                  </div>
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted />
                )}
                <canvas ref={canvasRef} hidden />
                <div className="scan-mask"><i /><i /><i /><i /><span className="scan-laser" /></div>
                {done && (
                  <div className="scan-done"><CheckCircle2 size={52} /><b>{done}</b><span>linked</span></div>
                )}
                {busy && !done && <div className="scan-done working"><div className="qr-spinner" /><span>Linking…</span></div>}
              </div>

              <div className="scan-tools">
                <button className="btn-secondary" onClick={flip}><RefreshCw size={14} /> Flip</button>
                <button className={`btn-secondary ${torch ? 'on' : ''}`} onClick={toggleTorch}><Zap size={14} /> Flash</button>
              </div>

              {err && <div className="linked-error">{err}</div>}

              <form className="scan-manual" onSubmit={submitManual}>
                <label><Keyboard size={14} /> Or type the code shown under the QR</label>
                <div>
                  <input
                    value={manual}
                    onChange={(e) => setManual(e.target.value)}
                    placeholder="CN-AB12-CD34"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <button className="btn-primary" type="submit" disabled={busy}>Link</button>
                </div>
              </form>
            </div>
          )}

          {view === 'devices' && (
            <>
              <div className="linked-hero">
                <div className="linked-art" aria-hidden="true">
                  <span className="pc"><Laptop size={30} /></span>
                  <span className="beam" />
                  <span className="ph"><Smartphone size={22} /></span>
                </div>
                <h3>Take your chats to the big screen</h3>
                <p>
                  Open ConnectNow on your computer, choose <b>QR login</b>, then scan the code here. No password needed on the PC.
                </p>
                <button className="btn-primary linked-cta" onClick={() => setView('scanner')}>
                  <ScanLine size={18} /> Link a device
                </button>
              </div>

              <div className="linked-note">
                <ShieldCheck size={16} />
                <span>Codes are single-use and expire in 2 minutes. Only approve codes you opened yourself.</span>
              </div>

              <div className="linked-list-head"><span>Your devices</span></div>
              <div className="linked-list">
                <div className="linked-row current">
                  <span className="linked-row-ico">{icon('smartphone')}</span>
                  <div>
                    <b>{describeThisPhone()}</b>
                    <small>Active now</small>
                  </div>
                  <em>This device</em>
                </div>
                {devices.map((d) => (
                  <div className="linked-row" key={d.id}>
                    <span className="linked-row-ico">{icon(d.deviceType)}</span>
                    <div>
                      <b>{d.deviceName}</b>
                      <small>{d.lastActive}</small>
                    </div>
                    <button className="btn-icon danger" title="Remove from list" onClick={() => removeDevice(d.id, d.deviceName)}>
                      <LogOut size={16} />
                    </button>
                  </div>
                ))}
                {devices.length === 0 && <div className="linked-empty">No computers linked yet.</div>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
