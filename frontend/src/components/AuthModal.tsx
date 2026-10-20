import React, { useState, useEffect } from 'react';
import { api, setAuthToken } from '../services/api';
import type { User } from '../types';
import {
  MessageSquare,
  Lock,
  Mail,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  QrCode,
  KeyRound,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface AuthModalProps {
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'qr_code' | 'password'>('qr_code');
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);

  // WhatsApp Web QR pairing states
  const [pairedDeviceStatus, setPairedDeviceStatus] = useState<string | null>(null);
  const [qrCountdown, setQrCountdown] = useState(30);
  const [sessionPairCode, setSessionPairCode] = useState(() =>
    `CN-PAIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  );

  // Listen for mobile scan authorization
  useEffect(() => {
    if (authMode !== 'qr_code') return;

    const checkPairedSession = () => {
      try {
        const raw = localStorage.getItem('cn_paired_device_auth');
        if (raw) {
          const payload = JSON.parse(raw);
          if (payload && payload.user) {
            setPairedDeviceStatus(payload.deviceName || 'Mobile Phone');
            sound.playPopSound();
            setTimeout(() => {
              if (payload.token) {
                setAuthToken(payload.token);
              }
              onSuccess(payload.user);
              localStorage.removeItem('cn_paired_device_auth');
            }, 1000);
          }
        }
      } catch (e) {
        console.error('QR sync error', e);
      }
    };

    const handleStorage = () => {
      checkPairedSession();
    };

    window.addEventListener('storage', handleStorage);
    const interval = setInterval(() => {
      checkPairedSession();
      setQrCountdown((c) => {
        if (c <= 1) {
          setSessionPairCode(`CN-PAIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
          return 30;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [authMode, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({
          usernameOrEmail: username,
          password,
        });
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.register({
          username,
          displayName,
          email,
          password,
        });
        setAuthToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateQrScan = async () => {
    setLoading(true);
    setError(null);
    try {
      // Demo instant corporate sign-in via simulated QR scanner
      const res = await api.login({
        usernameOrEmail: 'sandilya',
        password: 'password123',
      });
      setPairedDeviceStatus('iPhone 15 Pro (Scan simulator)');
      sound.playPopSound();
      setTimeout(() => {
        setAuthToken(res.token);
        onSuccess(res.user);
      }, 900);
    } catch {
      // If sandilya doesn't exist, try fallback or show message
      setError('Could not auto-sign in. Please enter credentials.');
      setAuthMode('password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ background: '#0a0e1a', backdropFilter: 'blur(30px)' }}>
      {authMode === 'qr_code' ? (
        /* WhatsApp Web Style QR Code Landing Card */
        <div
          className="modal-content"
          style={{
            maxWidth: '860px',
            width: '92%',
            padding: '40px',
            borderRadius: '24px',
            border: '1px solid var(--border-default)',
            background: 'var(--bg-secondary)',
            boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          }}
        >
          {/* Top Brand Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: '0 8px 24px var(--accent-glow)',
                }}
              >
                <MessageSquare size={26} />
              </div>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
                  ConnectNow for Web & Desktop
                </h1>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Secure multi-platform corporate sync • Mac, Windows, iOS & Android
                </div>
              </div>
            </div>

            <button
              className="btn-secondary"
              onClick={() => setAuthMode('password')}
              style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
            >
              <KeyRound size={15} /> Sign in with Password
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            {/* Left Steps */}
            <div>
              <h2 style={{ fontSize: '19px', fontWeight: 700, marginBottom: '20px', color: 'var(--text-primary)' }}>
                To use ConnectNow on your computer:
              </h2>
              <ol
                style={{
                  paddingLeft: '22px',
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  color: 'var(--text-secondary)',
                  fontSize: '14.5px',
                  lineHeight: '1.6',
                }}
              >
                <li>
                  Open <strong>ConnectNow</strong> on your phone (iOS / Android app)
                </li>
                <li>
                  Tap <strong>Settings</strong> or <strong>Linked Devices</strong> on the menu rail
                </li>
                <li>
                  Tap on <strong>Link a Device</strong> to activate the camera scanner
                </li>
                <li>
                  Point your phone camera to this QR code to capture it
                </li>
              </ol>

              <div style={{ marginTop: '28px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="keep-signed"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ accentColor: 'var(--accent-primary)', width: '16px', height: '16px' }}
                />
                <label htmlFor="keep-signed" style={{ fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Stay signed in on this computer
                </label>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className="btn-primary"
                  onClick={handleSimulateQrScan}
                  disabled={loading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    fontSize: '14px',
                    borderRadius: '12px',
                  }}
                >
                  <Smartphone size={18} /> {loading ? 'Authorizing...' : 'Simulate Mobile QR Scan'}
                </button>

                <button
                  onClick={() => {
                    setSessionPairCode(`CN-PAIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
                    setQrCountdown(30);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <RefreshCw size={13} /> Refresh Code
                </button>
              </div>
            </div>

            {/* Right QR Matrix Box with Scanning Laser Effect */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '250px',
                  height: '250px',
                  background: '#ffffff',
                  borderRadius: '20px',
                  margin: '0 auto',
                  padding: '18px',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                }}
              >
                {/* Paired Overlay when mobile scans */}
                {pairedDeviceStatus ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(16, 185, 129, 0.96)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      zIndex: 20,
                      animation: 'fadeIn 0.3s ease',
                      padding: '20px',
                      textAlign: 'center',
                    }}
                  >
                    <CheckCircle2 size={56} />
                    <div style={{ marginTop: '12px', fontWeight: 800, fontSize: '18px' }}>
                      Device Linked!
                    </div>
                    <div style={{ fontSize: '12.5px', opacity: 0.95, marginTop: '4px' }}>
                      Synchronizing session with {pairedDeviceStatus}...
                    </div>
                  </div>
                ) : (
                  <>
                    {/* QR Pattern */}
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gridTemplateRows: 'repeat(7, 1fr)',
                        gap: '4px',
                      }}
                    >
                      {Array.from({ length: 49 }).map((_, i) => {
                        const isCorner =
                          (i < 4 || (i >= 7 && i < 11) || (i >= 14 && i < 18)) || // Top Left
                          (i >= 3 && i < 7 && i % 7 >= 3) || // Top Right
                          (i >= 28 && i % 7 < 4); // Bottom Left
                        const isCenterLogo = i === 24;
                        const isPattern = !isCenterLogo && (isCorner || (i * 7) % 3 === 0 || (i * 11) % 4 === 1);

                        return (
                          <div
                            key={i}
                            style={{
                              background: isCenterLogo ? 'transparent' : isPattern ? '#0f172a' : '#f8fafc',
                              borderRadius: '2px',
                            }}
                          />
                        );
                      })}
                    </div>

                    {/* Center ConnectNow Logo */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: '#10b981',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      }}
                    >
                      <MessageSquare size={22} />
                    </div>

                    {/* Animated Green Laser Scan Line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, transparent 0%, #10b981 50%, transparent 100%)',
                        boxShadow: '0 0 12px #10b981',
                        animation: 'scanLine 2.5s ease-in-out infinite alternate',
                      }}
                    />
                  </>
                )}
              </div>

              <div
                style={{
                  marginTop: '16px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <ShieldCheck size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>Code refreshes in {qrCountdown}s</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {sessionPairCode}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Password Sign In / Register Card */
        <div className="modal-content" style={{ maxWidth: '420px', padding: '32px 28px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              <MessageSquare size={28} color="#ffffff" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>ConnectNow</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
              {isLogin ? 'Sign in to your corporate account' : 'Create an account to start chatting instantly'}
            </p>
          </div>

          <button
            onClick={() => setAuthMode('qr_code')}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              border: '1px solid var(--border-default)',
              background: 'var(--bg-glass)',
              color: 'var(--accent-primary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginBottom: '18px',
            }}
          >
            <QrCode size={16} /> Switch to WhatsApp Web QR Login
          </button>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f87171',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {!isLogin && (
              <div className="form-group">
                <label>Display Name</label>
                <div className="search-input-wrapper">
                  <UserIcon size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="e.g. Alice Cooper"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>{isLogin ? 'Username or Email' : 'Unique Username'}</label>
              <div className="search-input-wrapper">
                <UserIcon size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder={isLogin ? 'Enter username or email' : 'e.g. alice_c'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label>Email Address</label>
                <div className="search-input-wrapper">
                  <Mail size={16} color="var(--text-muted)" />
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label>Password</label>
              <div className="search-input-wrapper">
                <Lock size={16} color="var(--text-muted)" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>{loading ? 'Authenticating...' : isLogin ? 'Sign In' : 'Create Account'}</span>
              <ArrowRight size={16} />
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
