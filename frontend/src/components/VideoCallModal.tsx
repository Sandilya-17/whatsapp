import React, { useState, useEffect, useRef } from 'react';
import type { User, CallSignal } from '../types';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  MonitorUp,
  Shield,
  CircleDot,
  CheckCircle2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { sound } from '../utils/sound';

interface VideoCallModalProps {
  currentUser: User;
  peerUser: User;
  callType: 'audio' | 'video';
  isIncoming?: boolean;
  incomingOffer?: CallSignal | null;
  onSendSignal: (signal: Partial<CallSignal>) => void;
  activeSignal: CallSignal | null;
  onEndCall: (recordingBlob?: Blob) => void;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const VideoCallModal: React.FC<VideoCallModalProps> = ({
  currentUser,
  peerUser,
  callType,
  isIncoming = false,
  incomingOffer = null,
  onSendSignal,
  activeSignal,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [status, setStatus] = useState<'calling' | 'connecting' | 'connected' | 'ended'>(
    isIncoming ? 'connecting' : 'calling'
  );
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Call Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingSaved, setRecordingSaved] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // WebRTC & Media Stream References
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  // Duration Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (status === 'connected') {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  // Recording Timer
  useEffect(() => {
    let recTimer: ReturnType<typeof setInterval> | null = null;
    if (isRecording) {
      recTimer = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (recTimer) clearInterval(recTimer);
    };
  }, [isRecording]);

  // 1. Initialize PeerConnection and Local Media
  useEffect(() => {
    let isMounted = true;

    const setupConnection = async () => {
      try {
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        // Remote track handler
        pc.ontrack = (event) => {
          if (!isMounted) return;
          const [stream] = event.streams;
          remoteStreamRef.current = stream;

          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
          }
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
            remoteAudioRef.current.play().catch(() => {});
          }

          setStatus('connected');
          sound.stopRingtone();
          sound.playPopSound();
        };

        // ICE candidate handler
        pc.onicecandidate = (event) => {
          if (event.candidate && isMounted) {
            onSendSignal({
              type: 'ICE_CANDIDATE',
              callType,
              targetUserId: peerUser.id,
              targetUsername: peerUser.username,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'connected') {
            setStatus('connected');
            sound.stopRingtone();
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            setStatus('ended');
          }
        };

        // Get Local Media
        let localStream: MediaStream | null = null;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            localStream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: callType === 'video' ? { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            });
          }
        } catch (err) {
          console.warn('Microphone/Camera not available or denied:', err);
          // Synthetic audio track fallback so WebRTC SDP negotiation succeeds
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const dst = audioCtx.createMediaStreamDestination();
            osc.connect(dst);
            osc.start();
            localStream = dst.stream;
          } catch {
            localStream = new MediaStream();
          }
        }

        if (!isMounted) {
          localStream?.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = localStream;
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }

        // Add local tracks to peer connection
        if (localStream) {
          localStream.getTracks().forEach((track) => {
            pc.addTrack(track, localStream!);
          });
        }

        // Caller vs Callee initialization
        if (!isIncoming) {
          // CALLER: Start ringing & send SDP offer
          setStatus('calling');
          sound.playRingtone();

          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: callType === 'video',
          });
          await pc.setLocalDescription(offer);

          onSendSignal({
            type: 'CALL_OFFER',
            callType,
            callerId: currentUser.id,
            callerUsername: currentUser.username,
            callerName: currentUser.displayName,
            targetUserId: peerUser.id,
            targetUsername: peerUser.username,
            sdp: offer,
          });
        } else if (incomingOffer && incomingOffer.sdp) {
          // CALLEE: Process offer & send SDP answer
          setStatus('connecting');
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer.sdp));

          // Drain queued ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          onSendSignal({
            type: 'CALL_ANSWER',
            callType,
            targetUserId: peerUser.id,
            targetUsername: peerUser.username,
            sdp: answer,
          });

          setStatus('connected');
          sound.stopRingtone();
        }
      } catch (err) {
        console.error('WebRTC setup failed:', err);
      }
    };

    setupConnection();

    return () => {
      isMounted = false;
      sound.stopRingtone();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // 2. React to Incoming Signals during Active Call
  useEffect(() => {
    if (!activeSignal || !pcRef.current) return;

    const handleSignal = async () => {
      const pc = pcRef.current;
      if (!pc) return;

      if (activeSignal.type === 'CALL_ANSWER' && activeSignal.sdp) {
        try {
          sound.stopRingtone();
          if (pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(activeSignal.sdp));
          }
          // Drain queued candidates
          while (pendingCandidatesRef.current.length > 0) {
            const cand = pendingCandidatesRef.current.shift();
            if (cand) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
          setStatus('connected');
          sound.playPopSound();
        } catch (err) {
          console.warn('Error setting remote description:', err);
        }
      } else if (activeSignal.type === 'ICE_CANDIDATE' && activeSignal.candidate) {
        try {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(activeSignal.candidate));
          } else {
            pendingCandidatesRef.current.push(activeSignal.candidate);
          }
        } catch (err) {
          console.warn('Error adding ICE candidate:', err);
        }
      } else if (activeSignal.type === 'CALL_REJECT' || activeSignal.type === 'CALL_BUSY') {
        sound.stopRingtone();
        sound.playEndCallSound();
        setStatus('ended');
        setTimeout(() => {
          onEndCall();
        }, 1200);
      } else if (activeSignal.type === 'CALL_END') {
        sound.stopRingtone();
        sound.playEndCallSound();
        setStatus('ended');
        setTimeout(() => {
          onEndCall();
        }, 800);
      }
    };

    handleSignal();
  }, [activeSignal]);

  // Toggle Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
    }
  };

  // Toggle Video Camera
  const handleToggleVideo = () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !nextVideoOff;
      });
    }
  };

  // Flip Mobile Camera (Front / Rear)
  const handleFlipCamera = async () => {
    try {
      const nextFacing = facingMode === 'user' ? 'environment' : 'user';
      setFacingMode(nextFacing);

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: nextFacing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (pcRef.current) {
        const senders = pcRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (videoSender) {
          videoSender.replaceTrack(newVideoTrack);
        }
      }

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          localStreamRef.current.removeTrack(oldTrack);
          oldTrack.stop();
        }
        localStreamRef.current.addTrack(newVideoTrack);
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } catch (e) {
      console.warn('Camera flip not supported on this device:', e);
    }
  };

  // Screen Sharing
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          const screenTrack = displayStream.getVideoTracks()[0];

          if (pcRef.current) {
            const senders = pcRef.current.getSenders();
            const videoSender = senders.find((s) => s.track && s.track.kind === 'video');
            if (videoSender) {
              videoSender.replaceTrack(screenTrack);
            }
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }

          screenTrack.onended = () => {
            setIsScreenSharing(false);
            if (localStreamRef.current) {
              const camTrack = localStreamRef.current.getVideoTracks()[0];
              if (camTrack && pcRef.current) {
                const videoSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
                if (videoSender) videoSender.replaceTrack(camTrack);
              }
              if (localVideoRef.current) {
                localVideoRef.current.srcObject = localStreamRef.current;
              }
            }
          };

          setIsScreenSharing(true);
        }
      } catch {
        setIsScreenSharing(false);
      }
    } else {
      setIsScreenSharing(false);
      if (localStreamRef.current) {
        const camTrack = localStreamRef.current.getVideoTracks()[0];
        if (camTrack && pcRef.current) {
          const videoSender = pcRef.current.getSenders().find((s) => s.track && s.track.kind === 'video');
          if (videoSender) videoSender.replaceTrack(camTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
    }
  };

  // Recording
  const startRecording = () => {
    try {
      recordedChunksRef.current = [];
      const streamToRecord = remoteStreamRef.current || localStreamRef.current;
      if (!streamToRecord) return;

      const recorder = new MediaRecorder(streamToRecord, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
          ? 'video/webm;codecs=vp9'
          : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'audio/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        downloadRecording(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000);
      setIsRecording(true);
      sound.playPopSound();
    } catch (err) {
      console.warn('Call recording error:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const downloadRecording = (blob: Blob) => {
    setRecordingSaved(true);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ConnectNow_Call_${peerUser.displayName.replace(/\s+/g, '_')}_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => {
      URL.revokeObjectURL(url);
      setRecordingSaved(false);
    }, 4000);
  };

  // End Call
  const handleEndCall = () => {
    sound.stopRingtone();
    sound.playEndCallSound();
    if (isRecording) stopRecording();

    onSendSignal({
      type: 'CALL_END',
      callType,
      targetUserId: peerUser.id,
      targetUsername: peerUser.username,
    });

    onEndCall();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      modalContainerRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div
      ref={modalContainerRef}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#090d16',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)',
      }}
    >
      {/* Hidden Audio element for remote audio stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Main Container Card */}
      <div
        style={{
          width: '100%',
          maxWidth: isFullscreen ? '100vw' : '820px',
          height: isFullscreen ? '100vh' : '92vh',
          maxHeight: isFullscreen ? '100vh' : '680px',
          background: '#0f172a',
          borderRadius: isFullscreen ? '0' : '20px',
          border: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 70px rgba(0, 0, 0, 0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            zIndex: 30,
            background: 'linear-gradient(to bottom, rgba(15, 23, 42, 0.85) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} style={{ color: '#6c5cff' }} />
            <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>
              ConnectNow WebRTC HD • Encrypted
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Live Recording Badge */}
            {isRecording && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.25)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                <CircleDot size={12} className="pulse-danger" /> REC {formatTime(recordingSeconds)}
              </div>
            )}

            {/* Call State / Duration */}
            <div
              style={{
                padding: '5px 12px',
                borderRadius: '16px',
                background: 'rgba(0, 0, 0, 0.6)',
                backdropFilter: 'blur(8px)',
                fontSize: '13px',
                color: status === 'connected' ? '#6c5cff' : '#f8fafc',
                fontWeight: 600,
                fontFamily: 'monospace',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {status === 'calling'
                ? 'Ringing...'
                : status === 'connecting'
                ? 'Connecting...'
                : status === 'ended'
                ? 'Call Ended'
                : formatTime(callDuration)}
            </div>

            <button
              onClick={toggleFullscreen}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px',
                color: '#fff',
                cursor: 'pointer',
              }}
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Recording Saved Banner */}
        {recordingSaved && (
          <div
            style={{
              position: 'absolute',
              top: '64px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#6c5cff',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              zIndex: 40,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            <CheckCircle2 size={16} /> Call recording saved & downloaded!
          </div>
        )}

        {/* Remote Video / Calling Stage */}
        <div
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Remote Video Stream Element */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: status === 'connected' && callType === 'video' ? 'block' : 'none',
            }}
          />

          {/* Fallback / Avatar Stage (When audio-only, camera off, or ringing) */}
          {(status !== 'connected' || callType === 'audio') && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '24px',
                zIndex: 10,
              }}
            >
              {/* Pulsing Avatar */}
              <div
                style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #5546e8 0%, #6c5cff 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '48px',
                  fontWeight: 800,
                  color: '#fff',
                  boxShadow: status === 'connected' ? '0 0 50px rgba(108, 92, 255, 0.5)' : 'none',
                }}
              >
                {peerUser.displayName.charAt(0).toUpperCase()}
                {status === 'calling' && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: '-12px',
                      borderRadius: '50%',
                      border: '2px solid rgba(108, 92, 255, 0.4)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                )}
              </div>

              <h2 style={{ color: '#f8fafc', marginTop: '20px', marginBottom: '6px', fontSize: '24px', fontWeight: 700 }}>
                {peerUser.displayName}
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                {status === 'calling'
                  ? 'Calling... Waiting for answer'
                  : status === 'connecting'
                  ? 'Establishing secure WebRTC peer connection...'
                  : status === 'ended'
                  ? 'Call finished'
                  : 'Connected • HD Audio • End-to-End Encrypted'}
              </p>

              {/* Live Audio Visualizer Wave */}
              {status === 'connected' && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '24px', alignItems: 'center', height: '26px' }}>
                  {[10, 24, 14, 28, 16, 22, 12, 26, 8, 20, 15, 24, 18].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        width: '3.5px',
                        height: `${h}px`,
                        backgroundColor: '#6c5cff',
                        borderRadius: '3px',
                        animation: `pulse 0.7s infinite alternate ${i * 0.08}s`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Picture-in-Picture Local Camera Stream (Draggable / Floating) */}
          {callType === 'video' && !isVideoOff && (
            <div
              style={{
                position: 'absolute',
                bottom: '100px',
                right: '20px',
                width: '140px',
                height: '190px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                backgroundColor: '#000',
                zIndex: 25,
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '8px',
                  fontSize: '11px',
                  color: '#fff',
                  background: 'rgba(0,0,0,0.6)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 600,
                }}
              >
                You
              </div>
            </div>
          )}
        </div>

        {/* Bottom Interactive Call Controls Bar */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#0f172a',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            zIndex: 30,
            flexWrap: 'wrap',
          }}
        >
          {/* Mute Mic Button */}
          <button
            onClick={handleToggleMute}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>

          {/* Toggle Video Camera Button */}
          {callType === 'video' && (
            <button
              onClick={handleToggleVideo}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: isVideoOff ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
            >
              {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>
          )}

          {/* Flip Camera (Front / Back) */}
          {callType === 'video' && !isVideoOff && (
            <button
              onClick={handleFlipCamera}
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              title="Flip Camera (Front/Rear)"
            >
              <RefreshCw size={20} />
            </button>
          )}

          {/* Screen Sharing Button */}
          <button
            onClick={handleToggleScreenShare}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isScreenSharing ? '#3b82f6' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <MonitorUp size={20} />
          </button>

          {/* Call Recording Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: isRecording ? '#ef4444' : 'rgba(255, 255, 255, 0.12)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            title={isRecording ? 'Stop Recording' : 'Record Call to WebM'}
          >
            <CircleDot size={20} className={isRecording ? 'pulse-danger' : ''} />
          </button>

          {/* Hang Up / End Call (Red Button) */}
          <button
            onClick={handleEndCall}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.45)',
              transition: 'all 0.2s',
            }}
            title="End Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};
