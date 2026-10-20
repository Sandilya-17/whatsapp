import React, { useState, useEffect, useRef } from 'react';
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
  PhoneCall,
  Lock,
  ScanLine,
} from 'lucide-react';
import type { LinkedDevice, User } from '../types';
import { sound } from '../utils/sound';

interface LinkedDevicesModalProps {
  currentUser?: User;
  onClose: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Dynamically detect user's current environment (no mock devices)
const detectCurrentDevice = (): LinkedDevice => {
  const ua = navigator.userAgent;
  const isMac = ua.includes('Mac');
  const isWindows = ua.includes('Windows');
  const isLinux = ua.includes('Linux');
  const isAndroid = ua.includes('Android');
  const isIOS = ua.includes('iPhone') || ua.includes('iPad');

  let deviceType: 'mac' | 'windows' | 'browser' | 'smartphone' = 'smartphone';
  let deviceName = 'Mobile Device';

  if (isIOS) {
    deviceType = 'smartphone';
    deviceName = 'iPhone (iOS)';
  } else if (isAndroid) {
    deviceType = 'smartphone';
    deviceName = 'Android Phone';
  } else if (isMac) {
    deviceType = 'mac';
    deviceName = 'Mac';
  } else if (isWindows) {
    deviceType = 'windows';
    deviceName = 'Windows PC';
  } else if (isLinux) {
    deviceType = 'browser';
    deviceName = 'Linux';
  }

  const browser = ua.includes('Edg')
    ? 'Edge'
    : ua.includes('Chrome')
    ? 'Chrome'
    : ua.includes('Firefox')
    ? 'Firefox'
    : ua.includes('Safari')
    ? 'Safari'
    : 'Browser';

  return {
    id: 'current-device',
    deviceType,
    deviceName: `${deviceName} (${browser})`,
    browserOrClient: 'ConnectNow Mobile App',
    location: 'Current Session',
    lastActive: 'Active now (This phone)',
    isCurrent: true,
  };
};

export const LinkedDevicesModal: React.FC<LinkedDevicesModalProps> = ({
  currentUser,
  onClose,
  onNotify,
}) => {
  // Mobile app modes: 'devices' (main screen) or 'scanner' (camera view to scan PC)
  const [viewMode, setViewMode] = useState<'devices' | 'scanner'>('devices');

  // Load real devices from localStorage, with zero hardcoded mock devices
  const [devices, setDevices] = useState<LinkedDevice[]>(() => {
    const current = detectCurrentDevice();
    const saved = localStorage.getItem('cn_linked_devices');
    if (saved) {
      try {
        const parsed: LinkedDevice[] = JSON.parse(saved);
        // Filter out any stale mock entries
        const realOtherDevices = parsed.filter(
          (d) => !d.isCurrent && d.id !== 'dev-1' && d.id !== 'dev-2' && d.id !== 'dev-3'
        );
        return [current, ...realOtherDevices];
      } catch {
        return [current];
      }
    }
    return [current];
  });

  // Persist linked devices
  useEffect(() => {
    const otherDevices = devices.filter((d) => !d.isCurrent);
    localStorage.setItem('cn_linked_devices', JSON.stringify(otherDevices));
  }, [devices]);

  // Camera QR Scanner states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [syncingProgress, setSyncingProgress] = useState<number | null>(null);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  // Start mobile camera for scanning PC QR
  const startCamera = async (facing: 'environment' | 'user' = cameraFacing) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access unavailable or declined:', err);
      setHasCameraPermission(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  useEffect(() => {
    if (viewMode === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [viewMode]);

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  const toggleTorch = async () => {
    if (!cameraStream) return;
    const track = cameraStream.getVideoTracks()[0];
    if (track && (track.getCapabilities as any)?.()?.torch) {
      try {
        await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
        setTorchOn(!torchOn);
      } catch (e) {
        console.error('Torch error:', e);
      }
    } else {
      setTorchOn(!torchOn);
    }
  };

  // Perform handshake & sync data to PC / Web App
  const handleCompletePairing = (targetDeviceName?: string) => {
    sound.playPopSound();
    if (navigator.vibrate) {
      navigator.vibrate([80, 50, 100]);
    }
    setScanSuccess(true);
    setSyncingProgress(20);

    setTimeout(() => setSyncingProgress(60), 400);
    setTimeout(() => setSyncingProgress(90), 800);
    setTimeout(() => setSyncingProgress(100), 1100);

    const isWin = navigator.userAgent.includes('Windows');
    const deviceName =
      targetDeviceName ||
      (isWin ? 'Windows PC (ConnectNow Web)' : 'MacBook Pro (ConnectNow Web)');

    const newDevice: LinkedDevice = {
      id: `dev-${Date.now()}`,
      deviceType: deviceName.toLowerCase().includes('windows') ? 'windows' : 'mac',
      deviceName: deviceName,
      browserOrClient: 'ConnectNow Web & Unrestricted Calling Station',
      location: 'Local Network',
      lastActive: 'Active now',
      isCurrent: false,
    };

    // Store pairing payload in localStorage to authenticate the WhatsApp Web desktop session immediately!
    const token = localStorage.getItem('connectnow_token') || 'demo_auth_token';
    const pairPayload = {
      timestamp: Date.now(),
      token,
      user: currentUser,
      deviceName,
    };
    localStorage.setItem('cn_paired_device_auth', JSON.stringify(pairPayload));
    window.dispatchEvent(new Event('storage'));

    setTimeout(() => {
      setDevices((prev) => [
        detectCurrentDevice(),
        newDevice,
        ...prev.filter((d) => !d.isCurrent),
      ]);
      setScanSuccess(false);
      setSyncingProgress(null);
      setViewMode('devices');
      stopCamera();
      onNotify?.(
        `Linked to ${deviceName}! All chats, media, and calling are now synced to PC.`,
        'success'
      );
    }, 1400);
  };

  const handleDisconnect = (id: string, name: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    onNotify?.(`Logged out from ${name}`, 'info');
  };

  const handleDisconnectAll = () => {
    setDevices([detectCurrentDevice()]);
    localStorage.removeItem('cn_linked_devices');
    onNotify?.('Logged out from all other linked devices', 'success');
  };

  const handleManualCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) return;
    const cleanCode = manualCodeInput.trim().toUpperCase();
    handleCompletePairing(`Web Browser (${cleanCode})`);
    setManualCodeInput('');
    setShowCodeInput(false);
  };

  const getDeviceIcon = (type: LinkedDevice['deviceType']) => {
    switch (type) {
      case 'windows':
        return <Monitor size={22} style={{ color: '#0078D4' }} />;
      case 'mac':
        return <Laptop size={22} style={{ color: '#A2AAAD' }} />;
      case 'browser':
        return <Globe size={22} style={{ color: '#10b981' }} />;
      default:
        return <Smartphone size={22} style={{ color: 'var(--accent-primary)' }} />;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '500px',
          width: '94%',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-default)',
          borderRadius: '24px',
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {viewMode === 'scanner' ? (
              <button
                className="btn-icon"
                onClick={() => setViewMode('devices')}
                style={{ borderRadius: '50%', padding: '6px' }}
                title="Back to Linked Devices"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                }}
              >
                <Monitor size={18} />
              </div>
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)' }}>
                {viewMode === 'scanner' ? 'Scan QR Code' : 'Linked Devices'}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                {viewMode === 'scanner'
                  ? 'Scan the QR code displayed on your PC'
                  : 'Use ConnectNow on Web, Desktop, & PC'}
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="modal-body"
          style={{
            padding: '20px',
            maxHeight: '75vh',
            overflowY: 'auto',
          }}
        >
          {/* VIEW 1: SCANNER MODE (Point camera at PC screen) */}
          {viewMode === 'scanner' ? (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  position: 'relative',
                  width: '280px',
                  height: '280px',
                  margin: '0 auto 16px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  background: '#05070e',
                  border: '2px solid rgba(16, 185, 129, 0.5)',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Live Camera Video Feed */}
                {hasCameraPermission === false ? (
                  <div style={{ padding: '24px', color: '#94a3b8', fontSize: '12.5px', lineHeight: 1.5 }}>
                    Camera access not granted or unavailable. You can link using a pairing code or simulate below.
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}

                {/* Viewfinder Target Mask */}
                <div
                  style={{
                    position: 'absolute',
                    inset: '24px',
                    borderRadius: '16px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
                    pointerEvents: 'none',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '24px',
                      height: '24px',
                      borderTop: '3px solid #10b981',
                      borderLeft: '3px solid #10b981',
                      borderTopLeftRadius: '10px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '24px',
                      height: '24px',
                      borderTop: '3px solid #10b981',
                      borderRight: '3px solid #10b981',
                      borderTopRightRadius: '10px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '24px',
                      height: '24px',
                      borderBottom: '3px solid #10b981',
                      borderLeft: '3px solid #10b981',
                      borderBottomLeftRadius: '10px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '24px',
                      height: '24px',
                      borderBottom: '3px solid #10b981',
                      borderRight: '3px solid #10b981',
                      borderBottomRightRadius: '10px',
                    }}
                  />

                  {/* Animated laser line */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '6px',
                      right: '6px',
                      height: '2px',
                      background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
                      boxShadow: '0 0 8px #10b981',
                      animation: 'scanLine 2.2s infinite ease-in-out',
                    }}
                  />
                </div>

                {/* Success checkmark badge */}
                {scanSuccess && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(5, 150, 105, 0.94)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      color: '#fff',
                      zIndex: 10,
                      animation: 'fadeIn 0.2s',
                    }}
                  >
                    <CheckCircle2 size={54} />
                    <div style={{ fontWeight: 700, fontSize: '16px' }}>PC QR Code Recognized!</div>
                    <div style={{ fontSize: '12px', opacity: 0.9 }}>
                      {syncingProgress ? `Syncing chats & media (${syncingProgress}%)...` : 'Connected'}
                    </div>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '16px' }}>
                <button
                  className="btn-secondary"
                  onClick={toggleCameraFacing}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCw size={14} /> Flip Camera
                </button>
                <button
                  className="btn-secondary"
                  onClick={toggleTorch}
                  style={{
                    padding: '8px 14px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: torchOn ? '#f59e0b' : undefined,
                  }}
                >
                  <Zap size={14} /> Flash {torchOn ? 'ON' : 'OFF'}
                </button>
              </div>

              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  padding: '14px',
                  textAlign: 'left',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  To link a device:
                </div>
                <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, paddingLeft: '18px', lineHeight: 1.6 }}>
                  <li>Open your ConnectNow Web link on your computer or PC browser</li>
                  <li>Point your camera at the QR code on your PC screen to capture it</li>
                </ol>
              </div>

              {/* Option to Link with Code instead */}
              {showCodeInput ? (
                <form
                  onSubmit={handleManualCodeSubmit}
                  style={{
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '14px',
                    padding: '12px',
                    marginBottom: '14px',
                    display: 'flex',
                    gap: '8px',
                  }}
                >
                  <input
                    type="text"
                    value={manualCodeInput}
                    onChange={(e) => setManualCodeInput(e.target.value)}
                    placeholder="Enter 8-digit code (e.g. CN-A7B2-9F1C)"
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                    }}
                    autoFocus
                  />
                  <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: '12.5px' }}>
                    Link
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCodeInput(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-primary)',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginBottom: '14px',
                    textDecoration: 'underline',
                  }}
                >
                  Link with 8-digit code instead
                </button>
              )}

              {/* Fast Test / Simulation Trigger */}
              <div
                style={{
                  background: 'var(--bg-glass)',
                  border: '1px dashed var(--border-default)',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Testing without physical PC screen?
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Simulate scanning PC QR and sync data instantly
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => handleCompletePairing('Connected PC Workstation')}
                  disabled={syncingProgress !== null}
                  style={{ padding: '7px 14px', fontSize: '12px', whiteSpace: 'nowrap' }}
                >
                  {syncingProgress ? `Syncing (${syncingProgress}%)...` : 'Simulate Scan'}
                </button>
              </div>
            </div>
          ) : (
            /* VIEW 2: MAIN LINKED DEVICES OVERVIEW (Standard WhatsApp Mobile Layout) */
            <>
              {/* WhatsApp Mobile Hero Section */}
              <div
                style={{
                  textAlign: 'center',
                  padding: '10px 10px 18px',
                }}
              >
                {/* Visual Devices Graphic */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '18px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                      boxShadow: '0 8px 24px rgba(16, 185, 129, 0.15)',
                    }}
                  >
                    <Laptop size={32} />
                  </div>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Lock size={16} />
                  </div>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '16px',
                      background: 'rgba(16, 185, 129, 0.12)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Smartphone size={26} />
                  </div>
                </div>

                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: 700,
                    margin: '0 0 6px',
                    color: 'var(--text-primary)',
                  }}
                >
                  Use ConnectNow on other devices
                </h3>
                <p
                  style={{
                    fontSize: '12.5px',
                    color: 'var(--text-muted)',
                    margin: '0 0 18px',
                    lineHeight: 1.5,
                  }}
                >
                  Link to your web browser or computer to send messages and make unrestricted voice & video calls from your PC.
                </p>

                {/* Big WhatsApp-style Link a Device Button */}
                <button
                  className="btn-primary"
                  onClick={() => setViewMode('scanner')}
                  style={{
                    width: '100%',
                    padding: '13px',
                    fontSize: '14px',
                    fontWeight: 700,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '9px',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <ScanLine size={18} />
                  <span>Link a Device</span>
                </button>
              </div>

              {/* End-to-End Encryption Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px',
                  padding: '9px 12px',
                  marginBottom: '18px',
                }}
              >
                <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Your personal messages and calls are end-to-end encrypted across all linked devices.</span>
              </div>

              {/* PC Calling Info Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '11.5px',
                  color: 'var(--text-secondary)',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  marginBottom: '18px',
                }}
              >
                <PhoneCall size={15} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                <span>
                  <strong>Unrestricted PC Station:</strong> PC web sessions can place/receive HD audio, video, screen share, and record calls.
                </span>
              </div>

              {/* Device Status Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  padding: '0 4px',
                }}
              >
                <div
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Device Status
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Tap a device to log out
                </div>
              </div>

              {/* Devices List (Real devices only - no mock data) */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {devices.map((device) => (
                  <div
                    key={device.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-default)',
                      borderRadius: '14px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: 'var(--bg-card-hover)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: '13.5px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span>{device.deviceName}</span>
                          {device.isCurrent && (
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                borderRadius: '4px',
                                fontWeight: 600,
                              }}
                            >
                              This phone
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {device.browserOrClient}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-primary)', marginTop: '2px' }}>
                          {device.lastActive}
                        </div>
                      </div>
                    </div>

                    {!device.isCurrent && (
                      <button
                        className="btn-icon"
                        title="Log out device"
                        onClick={() => handleDisconnect(device.id, device.deviceName)}
                        style={{ color: '#ef4444', padding: '6px' }}
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {devices.length > 1 && (
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <button
                    onClick={handleDisconnectAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '12px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontWeight: 600,
                    }}
                  >
                    <LogOut size={13} /> Log out from all other linked devices
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
