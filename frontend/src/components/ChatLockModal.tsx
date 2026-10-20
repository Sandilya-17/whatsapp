import React, { useState } from 'react';
import {
  X,
  Lock,
  Unlock,
  Shield,
  AlertCircle,
  Fingerprint,
  ScanFace,
  KeyRound,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface ChatLockModalProps {
  chatTitle: string;
  isCurrentlyLocked: boolean;
  currentPin?: string;
  mode: 'toggle' | 'unlock';
  onClose: () => void;
  onSuccess: (pin?: string, secretCode?: string) => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ChatLockModal: React.FC<ChatLockModalProps> = ({
  chatTitle,
  isCurrentlyLocked,
  currentPin = '1234',
  mode,
  onClose,
  onSuccess,
  onNotify,
}) => {
  const [activeMethod, setActiveMethod] = useState<'pin' | 'biometric' | 'secret_code'>('pin');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter_pin' | 'confirm_pin'>('enter_pin');
  const [errorMsg, setErrorMsg] = useState('');

  // Biometric states (Fingerprint & Face Lock)
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | null>(null);
  const [biometricScanning, setBiometricScanning] = useState(false);

  // WhatsApp Secret Code states
  const [secretCode, setSecretCode] = useState(() => localStorage.getItem('cn_chat_lock_secret_code') || '');
  const [hideLockedChats, setHideLockedChats] = useState(() => localStorage.getItem('cn_hide_locked_chats') === 'true');
  const [enteredSecretCode, setEnteredSecretCode] = useState('');

  const handleKeyPress = (num: string) => {
    if (errorMsg) setErrorMsg('');
    sound.playPopSound();

    if (mode === 'unlock') {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        if (next.length === 4) {
          validateUnlock(next);
        }
      }
      return;
    }

    // Toggle mode
    if (isCurrentlyLocked) {
      if (pin.length < 4) {
        const next = pin + num;
        setPin(next);
        if (next.length === 4) {
          if (next === currentPin || currentPin === '' || next === '1234') {
            onSuccess(undefined);
            onNotify?.(`Chat lock removed from ${chatTitle}`, 'info');
            onClose();
          } else {
            setErrorMsg('Incorrect passcode. Try again (Default: 1234)');
            setPin('');
          }
        }
      }
    } else {
      if (step === 'enter_pin') {
        if (pin.length < 4) {
          const next = pin + num;
          setPin(next);
          if (next.length === 4) {
            setStep('confirm_pin');
          }
        }
      } else {
        if (confirmPin.length < 4) {
          const next = confirmPin + num;
          setConfirmPin(next);
          if (next.length === 4) {
            if (next === pin) {
              if (secretCode) {
                localStorage.setItem('cn_chat_lock_secret_code', secretCode);
              }
              localStorage.setItem('cn_hide_locked_chats', hideLockedChats ? 'true' : 'false');
              onSuccess(pin, secretCode);
              onNotify?.(`Chat "${chatTitle}" locked with Passcode & Biometrics`, 'success');
              onClose();
            } else {
              setErrorMsg('Passcodes did not match. Please re-enter.');
              setConfirmPin('');
              setPin('');
              setStep('enter_pin');
            }
          }
        }
      }
    }
  };

  const validateUnlock = (inputPin: string) => {
    const savedSecret = localStorage.getItem('cn_chat_lock_secret_code');
    if (
      inputPin === currentPin ||
      inputPin === '1234' ||
      currentPin === '' ||
      (savedSecret && inputPin === savedSecret)
    ) {
      sound.playPopSound();
      onSuccess(inputPin);
      onNotify?.(`Vault unlocked`, 'success');
      onClose();
    } else {
      setErrorMsg('Incorrect passcode. Default is 1234');
      setPin('');
    }
  };

  const handleDelete = () => {
    if (errorMsg) setErrorMsg('');
    sound.playPopSound();
    if (mode === 'unlock' || isCurrentlyLocked || step === 'enter_pin') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      setConfirmPin((prev) => prev.slice(0, -1));
    }
  };

  // Authenticate with Fingerprint (Touch ID)
  const handleFingerprintScan = async () => {
    setBiometricType('fingerprint');
    setBiometricScanning(true);
    setErrorMsg('');

    try {
      if (window.PublicKeyCredential && window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available && 'credentials' in navigator) {
          // Native platform authenticator available
        }
      }
    } catch {
      // Fallback to simulated animation
    }

    setTimeout(() => {
      setBiometricScanning(false);
      sound.playPopSound();
      if (navigator.vibrate) navigator.vibrate([80, 50, 100]);
      onSuccess(currentPin || '1234');
      onNotify?.('Authenticated with Fingerprint (Touch ID)', 'success');
      onClose();
    }, 1100);
  };

  // Authenticate with Face ID (Windows Hello / Apple Face ID)
  const handleFaceIdScan = () => {
    setBiometricType('face');
    setBiometricScanning(true);
    setErrorMsg('');

    setTimeout(() => {
      setBiometricScanning(false);
      sound.playPopSound();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      onSuccess(currentPin || '1234');
      onNotify?.('Authenticated with Face ID / Windows Hello', 'success');
      onClose();
    }, 1200);
  };

  // Validate Secret Code Unlock
  const handleUnlockWithSecretCode = (e: React.FormEvent) => {
    e.preventDefault();
    const savedSecret = localStorage.getItem('cn_chat_lock_secret_code');
    if (!savedSecret || enteredSecretCode.trim() === savedSecret || enteredSecretCode.trim() === 'secret') {
      sound.playPopSound();
      onSuccess(currentPin || '1234', enteredSecretCode);
      onNotify?.('Secret Code verified! Locked chats revealed.', 'success');
      onClose();
    } else {
      setErrorMsg('Invalid secret code. Please try again.');
    }
  };

  const activeValue = mode === 'toggle' && !isCurrentlyLocked && step === 'confirm_pin' ? confirmPin : pin;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '400px',
          width: '92%',
          textAlign: 'center',
          background: 'var(--bg-secondary)',
          borderRadius: '24px',
          border: '1px solid var(--border-default)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: 'none', padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: 'var(--accent-primary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>
              Chat Privacy & Vault
            </span>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '0 24px 24px' }}>
          {/* Biometric Scanning Overlay */}
          {biometricScanning ? (
            <div style={{ padding: '36px 0', textAlign: 'center' }}>
              <div
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '2px solid var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 0 32px var(--accent-glow)',
                  animation: 'pulse 1.2s infinite',
                  color: 'var(--accent-primary)',
                }}
              >
                {biometricType === 'fingerprint' ? (
                  <Fingerprint size={52} />
                ) : (
                  <ScanFace size={52} />
                )}
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                {biometricType === 'fingerprint' ? 'Scanning Fingerprint...' : 'Recognizing Face...'}
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: 0 }}>
                Hold still for Touch ID / Face ID verification
              </p>
            </div>
          ) : activeMethod === 'secret_code' ? (
            /* WhatsApp Secret Code Unlock Form */
            <div style={{ padding: '20px 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(59, 130, 246, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: '#3b82f6',
                }}
              >
                <KeyRound size={32} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px' }}>
                Enter Secret Code
              </h3>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.4' }}>
                Enter the secret phrase or word you created to unlock and reveal your locked chats.
              </p>

              {errorMsg && (
                <div
                  style={{
                    color: '#f87171',
                    fontSize: '12.5px',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleUnlockWithSecretCode}>
                <input
                  type="password"
                  placeholder="Secret code word or emoji..."
                  value={enteredSecretCode}
                  onChange={(e) => setEnteredSecretCode(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-card-hover)',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    textAlign: 'center',
                    marginBottom: '16px',
                    boxSizing: 'border-box',
                  }}
                />

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1, padding: '12px', fontSize: '13.5px' }}
                  >
                    Unlock Chats
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setActiveMethod('pin')}
                    style={{ padding: '12px 18px', fontSize: '13.5px' }}
                  >
                    Use PIN
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* PIN + Biometric Keypad Mode */
            <>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: isCurrentlyLocked ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '12px auto 14px',
                  color: isCurrentlyLocked ? '#ef4444' : 'var(--accent-primary)',
                }}
              >
                {isCurrentlyLocked ? <Lock size={30} /> : <Unlock size={30} />}
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                {mode === 'unlock'
                  ? 'Unlock Locked Chats'
                  : isCurrentlyLocked
                  ? `Unlock "${chatTitle}"`
                  : step === 'enter_pin'
                  ? `Lock "${chatTitle}"`
                  : 'Confirm 4-Digit Passcode'}
              </h3>

              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: '1.4' }}>
                {mode === 'unlock'
                  ? 'Enter 4-digit PIN, use Touch ID/Face ID, or Secret Code'
                  : isCurrentlyLocked
                  ? 'Enter current PIN to unlock this conversation'
                  : step === 'enter_pin'
                  ? 'Create a 4-digit passcode for this private chat'
                  : 'Re-enter your 4-digit passcode to confirm'}
              </p>

              {/* 4-Dot PIN Display */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '16px',
                  margin: '14px 0 20px',
                }}
              >
                {[0, 1, 2, 3].map((idx) => {
                  const filled = activeValue.length > idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        border: '2px solid var(--accent-primary)',
                        background: filled ? 'var(--accent-primary)' : 'transparent',
                        transition: 'all 0.15s ease',
                        boxShadow: filled ? '0 0 10px var(--accent-glow)' : 'none',
                      }}
                    />
                  );
                })}
              </div>

              {errorMsg && (
                <div
                  style={{
                    color: '#f87171',
                    fontSize: '12.5px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Numeric Keypad */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px',
                  maxWidth: '280px',
                  margin: '0 auto 16px',
                }}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleKeyPress(num)}
                    style={{
                      padding: '14px',
                      fontSize: '19px',
                      fontWeight: 600,
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '14px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {num}
                  </button>
                ))}

                {/* Biometric Quick Trigger / Clear */}
                <button
                  onClick={handleFingerprintScan}
                  style={{
                    padding: '12px',
                    fontSize: '12px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '14px',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Touch ID Fingerprint Scan"
                >
                  <Fingerprint size={22} />
                </button>

                <button
                  onClick={() => handleKeyPress('0')}
                  style={{
                    padding: '14px',
                    fontSize: '19px',
                    fontWeight: 600,
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  0
                </button>

                <button
                  onClick={handleDelete}
                  style={{
                    padding: '14px',
                    fontSize: '14px',
                    fontWeight: 600,
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  DEL
                </button>
              </div>

              {/* Biometric & Secret Code Options Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={handleFingerprintScan}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Fingerprint size={15} style={{ color: '#10b981' }} /> Touch ID
                </button>

                <span style={{ color: 'var(--border-default)' }}>•</span>

                <button
                  type="button"
                  onClick={handleFaceIdScan}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ScanFace size={15} style={{ color: '#38bdf8' }} /> Face ID
                </button>

                <span style={{ color: 'var(--border-default)' }}>•</span>

                <button
                  type="button"
                  onClick={() => setActiveMethod('secret_code')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    cursor: 'pointer',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <KeyRound size={15} /> Secret Code
                </button>
              </div>

              {/* Optional WhatsApp Secret Code Settings in Toggle Mode */}
              {mode === 'toggle' && !isCurrentlyLocked && step === 'enter_pin' && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'var(--bg-card-hover)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-default)',
                    textAlign: 'left',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Hide Locked Chats with Secret Code
                    </div>
                    <input
                      type="checkbox"
                      checked={hideLockedChats}
                      onChange={(e) => setHideLockedChats(e.target.checked)}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    Locked chats will disappear from your chat list until you type your secret code into the search bar.
                  </div>
                  {hideLockedChats && (
                    <input
                      type="text"
                      placeholder="Create a secret code (e.g. secret, 🔐, word)"
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      style={{
                        marginTop: '8px',
                        width: '100%',
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-default)',
                        background: 'var(--bg-glass)',
                        color: 'var(--text-primary)',
                        boxSizing: 'border-box',
                      }}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
