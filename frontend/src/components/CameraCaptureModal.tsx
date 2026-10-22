import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, RefreshCw, Send, RotateCcw } from 'lucide-react';

interface CameraCaptureModalProps {
  onClose: () => void;
  /** Called with the captured photo as a File, ready to upload. */
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({ onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'user' | 'environment'>('environment');
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string } | null>(null);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (shot) return;
    let cancelled = false;
    setError(null);
    stopStream();

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not supported in this browser (it also needs HTTPS).');
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => setError('Camera permission denied or no camera found. Allow camera access in your browser settings.'));

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [facing, shot]);

  useEffect(() => () => {
    stopStream();
  }, []);

  useEffect(() => {
    return () => {
      if (shot) URL.revokeObjectURL(shot.url);
    };
  }, [shot]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // mirror selfies back so the saved photo matches the preview
    if (facing === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) setShot({ blob, url: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      0.88
    );
  };

  const send = () => {
    if (!shot) return;
    const file = new File([shot.blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
    stopStream();
    onCapture(file);
    onClose();
  };

  return (
    <div className="camera-modal" role="dialog" aria-label="Camera">
      <div className="camera-top">
        <button className="camera-round" onClick={onClose} aria-label="Close camera">
          <X size={22} />
        </button>
        {!shot && !error && (
          <button className="camera-round" onClick={() => setFacing((f) => (f === 'user' ? 'environment' : 'user'))} aria-label="Switch camera">
            <RefreshCw size={20} />
          </button>
        )}
      </div>

      <div className="camera-stage">
        {error ? (
          <div className="camera-error">{error}</div>
        ) : shot ? (
          <img src={shot.url} alt="Captured" />
        ) : (
          <video ref={videoRef} playsInline muted autoPlay style={{ transform: facing === 'user' ? 'scaleX(-1)' : 'none' }} />
        )}
      </div>

      <div className="camera-bottom">
        {shot ? (
          <>
            <button className="camera-pill" onClick={() => setShot(null)}>
              <RotateCcw size={18} /> Retake
            </button>
            <button className="camera-pill primary" onClick={send}>
              <Send size={18} /> Send
            </button>
          </>
        ) : (
          !error && (
            <button className="camera-shutter" onClick={takePhoto} aria-label="Take photo">
              <Camera size={26} />
            </button>
          )
        )}
      </div>
    </div>
  );
};
