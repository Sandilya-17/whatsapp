import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Laptop,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  QrCode
} from 'lucide-react';

interface DownloadAppsModalProps {
  onClose: () => void;
  onOpenLinkedDevices?: () => void;
  onNotify?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const DownloadAppsModal: React.FC<DownloadAppsModalProps> = ({
  onClose,
  onOpenLinkedDevices,
  onNotify,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<'mac' | 'windows' | 'ios' | 'android'>(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
    if (/android/.test(userAgent)) return 'android';
    if (/macintosh|mac os x/.test(userAgent)) return 'mac';
    return 'windows';
  });

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        onNotify?.('ConnectNow installed successfully!', 'success');
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      onNotify?.(
        'To install: In Chrome/Edge/Brave, click the Install icon in the right side of the address bar.',
        'info'
      );
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{
          maxWidth: '680px',
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
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <Download size={22} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-primary)' }}>
                Download & Install ConnectNow
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Seamless cross-platform synchronization across all your corporate devices
              </div>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ borderRadius: '50%' }}>
            <X size={18} />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            padding: '12px 24px',
            gap: '8px',
            background: 'var(--bg-glass)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <button
            onClick={() => setSelectedPlatform('mac')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: selectedPlatform === 'mac' ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: selectedPlatform === 'mac' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: selectedPlatform === 'mac' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Laptop size={18} /> macOS
          </button>

          <button
            onClick={() => setSelectedPlatform('windows')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: selectedPlatform === 'windows' ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: selectedPlatform === 'windows' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: selectedPlatform === 'windows' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Monitor size={18} /> Windows
          </button>

          <button
            onClick={() => setSelectedPlatform('ios')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: selectedPlatform === 'ios' ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: selectedPlatform === 'ios' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: selectedPlatform === 'ios' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Smartphone size={18} /> iOS (iPhone)
          </button>

          <button
            onClick={() => setSelectedPlatform('android')}
            style={{
              padding: '10px 8px',
              borderRadius: '10px',
              border: selectedPlatform === 'android' ? '1px solid var(--accent-primary)' : '1px solid transparent',
              background: selectedPlatform === 'android' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              color: selectedPlatform === 'android' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <Smartphone size={18} /> Android
          </button>
        </div>

        {/* Content Details */}
        <div className="modal-body" style={{ padding: '28px 24px' }}>
          {/* macOS View */}
          {selectedPlatform === 'mac' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                    border: '1px solid var(--border-default)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                  }}
                >
                  <Laptop size={32} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                    ConnectNow Enterprise for Mac
                  </h3>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Optimized for macOS Sonoma, Ventura & Monterey. Features native Dock notifications, unread message badges, hardware-accelerated video calling, and WhatsApp Web QR code pairing.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>
                  Features on macOS:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Standalone Desktop Window
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Touch ID / PIN Chat Lock
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Keyboard Shortcuts (Cmd+K)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> WhatsApp Web Screen QR Pairing
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-primary"
                  onClick={handleInstallPwa}
                  style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download size={18} /> {isInstalled ? 'Launch Desktop App' : 'Install ConnectNow for Mac'}
                </button>
                {onOpenLinkedDevices && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenLinkedDevices();
                    }}
                    style={{ padding: '12px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <QrCode size={16} /> Link via QR
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Windows View */}
          {selectedPlatform === 'windows' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #0078D4, #005a9e)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(0, 120, 212, 0.3)',
                  }}
                >
                  <Monitor size={32} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                    ConnectNow Enterprise for Windows 11 & 10
                  </h3>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Connect directly to your Windows PC workstation. Supports Windows Action Center toast notifications, Start Menu pin, and seamless phone camera QR sync.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>
                  Features on Windows:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Taskbar Pinning & Badges
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Windows Action Center Toasts
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> WhatsApp Web Pairing QR
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Auto-start on Windows Boot
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="btn-primary"
                  onClick={handleInstallPwa}
                  style={{ flex: 1, padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download size={18} /> {isInstalled ? 'Launch Windows App' : 'Install for Windows'}
                </button>
                {onOpenLinkedDevices && (
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      onClose();
                      onOpenLinkedDevices();
                    }}
                    style={{ padding: '12px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                  >
                    <QrCode size={16} /> Link via QR
                  </button>
                )}
              </div>
            </div>
          )}

          {/* iOS View */}
          {selectedPlatform === 'ios' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #059669, #10b981)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Smartphone size={32} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                    ConnectNow Mobile for Apple iOS (iPhone & iPad)
                  </h3>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Runs as a full-screen native iOS app with camera QR code scanning to link desktop workstations, photo status stories, voice notes, and haptic feedback.
                  </p>
                </div>
              </div>

              {/* iOS 3-Step Installation Guide */}
              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '16px',
                  padding: '20px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14.5px', marginBottom: '14px', color: 'var(--text-primary)' }}>
                  How to Install on iPhone / iPad in 3 Taps:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Open this URL in <strong>Apple Safari</strong> on your iPhone
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      2
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Tap the <strong>Share button</strong> <Share size={15} style={{ verticalAlign: 'middle', margin: '0 4px', color: '#38bdf8' }} /> at the bottom of Safari
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                        flexShrink: 0,
                      }}
                    >
                      3
                    </div>
                    <div style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                      Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare size={15} style={{ verticalAlign: 'middle', margin: '0 4px', color: '#10b981' }} />
                    </div>
                  </div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  onNotify?.('On your iPhone, tap Safari Share -> Add to Home Screen!', 'info');
                }}
                style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              >
                Got It — Ready to Add on iOS
              </button>
            </div>
          )}

          {/* Android View */}
          {selectedPlatform === 'android' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '16px',
                    background: 'linear-gradient(135deg, #10b981, #047857)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <Smartphone size={32} />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                    ConnectNow Mobile for Android
                  </h3>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    Instant 1-tap installation on Google Pixel, Samsung Galaxy, OnePlus, and all Android devices. Supports camera QR barcode scanning, push notifications, and background sync.
                  </p>
                </div>
              </div>

              <div
                style={{
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  borderRadius: '14px',
                  padding: '18px',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '10px' }}>
                  Android Mobile Capabilities:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> 1-Tap Home Screen App
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Live Camera QR Viewfinder
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Photo & Story Uploads
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} color="#10b981" /> Native Haptics & Vibration
                  </div>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={handleInstallPwa}
                style={{ width: '100%', padding: '12px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Download size={18} /> Install Android App (1-Tap)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
