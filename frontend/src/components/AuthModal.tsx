import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, setAuthToken } from '../services/api';
import type { User } from '../types';
import {
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  QrCode,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Smartphone,
  Zap,
  Video,
} from 'lucide-react';
import { sound } from '../utils/sound';
import { buildLinkUrl, describeThisDevice } from '../utils/deviceLink';
import { Logo } from './Logo';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

type QrState = 'loading' | 'ready' | 'error' | 'linked';

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  // Phones can't scan their own screen, so start with the password form there.
  const [authMode, setAuthMode] = useState<'qr_code' | 'password'>(() =>
    window.matchMedia('(max-width: 820px)').matches ? 'password' : 'qr_code'
  );
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ---- Real QR pairing (PC side) ----
  const [qrState, setQrState] = useState<QrState>('loading');
  const [qrImage, setQrImage] = useState<string>('');
  const [pairCode, setPairCode] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [qrError, setQrError] = useState<string>('');
  const finished = useRef(false);

  const newCode = useCallback(async () => {
    setQrState('loading');
    setQrError('');
    try {
      const res = await api.qrCreate(describeThisDevice());
      const dataUrl = await QRCode.toDataURL(buildLinkUrl(res.code), {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 480,
        color: { dark: '#14112b', light: '#ffffff' },
      });
      setPairCode(res.code);
      setQrImage(dataUrl);
      setSecondsLeft(res.expiresInSeconds);
      setQrState('ready');
    } catch (e: any) {
      setQrError(e?.message || 'Could not reach the server.');
      setQrState('error');
    }
  }, []);

  useEffect(() => {
    if (authMode !== 'qr_code') return;
    finished.current = false;
    newCode();
    return () => {
      finished.current = true;
    };
  }, [authMode, newCode]);

  // Poll the server until the phone approves this code.
  useEffect(() => {
    if (authMode !== 'qr_code' || qrState !== 'ready' || !pairCode) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await api.qrStatus(pairCode);
        if (stop || finished.current) return;
        if (res.status === 'APPROVED' && res.token && res.user) {
          finished.current = true;
          setQrState('linked');
          sound.playPopSound();
          setAuthToken(res.token);
          setTimeout(() => onSuccess(res.user as User), 900);
        } else if (res.status === 'EXPIRED') {
          newCode();
        }
      } catch {
        /* server may be waking up; keep polling */
      }
    };
    const poll = setInterval(tick, 2000);
    const clock = setInterval(() => setSecondsLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => {
      stop = true;
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [authMode, qrState, pairCode, newCode, onSuccess]);

  useEffect(() => {
    if (qrState === 'ready' && secondsLeft === 0 && authMode === 'qr_code') newCode();
  }, [secondsLeft, qrState, authMode, newCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isLogin) {
        const res = await api.login({ usernameOrEmail: username, password });
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.register({ username, displayName, email, password });
        setAuthToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-aurora" aria-hidden="true">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
      </div>

      {authMode === 'qr_code' ? (
        <div className="auth-card auth-card-wide">
          <div className="auth-topbar">
            <div className="auth-brand">
              <Logo size={46} />
              <div>
                <h1>ConnectNow</h1>
                <p>Chat, call and share, on every screen you own.</p>
              </div>
            </div>
            <button className="btn-secondary" onClick={() => setAuthMode('password')}>
              <KeyRound size={15} /> Use password
            </button>
          </div>

          <div className="auth-split">
            <div className="auth-steps">
              <h2>Link this computer in 10 seconds</h2>
              <ol>
                <li><span>1</span><div>Open ConnectNow on your phone and sign in.</div></li>
                <li><span>2</span><div>Go to <b>Linked devices</b> and tap <b>Link a device</b>.</div></li>
                <li><span>3</span><div>Point the camera at the code. You'll be signed in here instantly.</div></li>
              </ol>
              <div className="auth-assure">
                <ShieldCheck size={16} />
                <span>Each code works once and expires in two minutes.</span>
              </div>
            </div>

            <div className="auth-qr-side">
              <div className={`qr-frame ${qrState}`}>
                {qrState === 'ready' && <img src={qrImage} alt="Scan to link this computer" />}
                {qrState === 'loading' && <div className="qr-spinner" />}
                {qrState === 'error' && (
                  <div className="qr-overlay">
                    <AlertCircle size={30} />
                    <p>{qrError || 'Server is waking up.'}</p>
                    <button className="btn-primary" onClick={newCode}><RefreshCw size={14} /> Try again</button>
                  </div>
                )}
                {qrState === 'linked' && (
                  <div className="qr-overlay ok">
                    <CheckCircle2 size={44} />
                    <p>Linked. Signing you in…</p>
                  </div>
                )}
                {qrState === 'ready' && <span className="qr-scanline" />}
              </div>

              <div className="qr-meta">
                <span className="qr-code-text">{pairCode || '···-····-····'}</span>
                <span className="qr-dot" />
                <span>{qrState === 'ready' ? `expires in ${secondsLeft}s` : 'getting code…'}</span>
                <button className="qr-refresh" onClick={newCode} title="New code" aria-label="New code">
                  <RefreshCw size={13} />
                </button>
              </div>
              <p className="qr-hint">No camera? Type the code above in <b>Linked devices → Link with code</b>.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="auth-card auth-card-narrow">
          <div className="auth-brand stacked">
            <Logo size={58} />
            <h1>ConnectNow</h1>
            <p>{isLogin ? 'Welcome back. Sign in to continue.' : 'Create your account and start talking.'}</p>
          </div>

          <button className="auth-switch" onClick={() => setAuthMode('qr_code')}>
            <QrCode size={16} /> Sign in with a QR code from your phone
          </button>

          {error && (
            <div className="auth-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="form-group">
                <label>Display name</label>
                <div className="search-input-wrapper">
                  <UserIcon size={16} />
                  <input type="text" placeholder="e.g. Alice Cooper" value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{isLogin ? 'Username or email' : 'Unique username'}</label>
              <div className="search-input-wrapper">
                <UserIcon size={16} />
                <input type="text" placeholder={isLogin ? 'Enter username or email' : 'e.g. alice_c'}
                  value={username} onChange={(e) => setUsername(e.target.value)}
                  autoCapitalize="none" autoCorrect="off" required />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Email</label>
                <div className="search-input-wrapper">
                  <Mail size={16} />
                  <input type="email" placeholder="name@example.com" value={email}
                    onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <div className="search-input-wrapper">
                <Lock size={16} />
                <input type="password" placeholder="••••••••" value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </div>

            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              <span>{loading ? 'Please wait…' : isLogin ? 'Sign in' : 'Create account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="auth-foot">
            <button type="button" className="link-btn"
              onClick={() => { setIsLogin(!isLogin); setError(null); }}>
              {isLogin ? "New here? Create an account" : 'Have an account? Sign in'}
            </button>
          </div>

          <div className="auth-perks">
            <span><Zap size={13} /> Real-time</span>
            <span><Video size={13} /> HD calls</span>
            <span><Smartphone size={13} /> Phone + PC</span>
          </div>
        </div>
      )}
    </div>
  );
};
