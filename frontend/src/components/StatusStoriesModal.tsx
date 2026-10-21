import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, X, Heart, Eye, Upload, Image as ImageIcon, Type, Sparkles, Trash2 } from 'lucide-react';
import type { User, StatusStory } from '../types';
import { api } from '../services/api';
import {
  getStoredStories,
  postStory,
  removeStory,
  refreshStories,
  subscribeToStatusUpdates,
} from '../utils/statusStorage';

interface StatusStoriesModalProps {
  currentUser: User;
  contacts: User[];
  onClose: () => void;
}

const GRADIENTS = [
  'linear-gradient(135deg, #059669 0%, #10b981 100%)',
  'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
  'linear-gradient(135deg, #db2777 0%, #ec4899 100%)',
  'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
];

export const StatusStoriesModal: React.FC<StatusStoriesModalProps> = ({
  currentUser,
  contacts: _contacts,
  onClose,
}) => {
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createMode, setCreateMode] = useState<'text' | 'media'>('media');
  const [newContent, setNewContent] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real uploaded stories only - NO demo mock stories
  const [stories, setStories] = useState<StatusStory[]>(() => getStoredStories());

  useEffect(() => {
    const unsub = subscribeToStatusUpdates(() => {
      setStories(getStoredStories());
    });
    void refreshStories();
    return unsub;
  }, []);

  // Story playback timer
  useEffect(() => {
    if (activeStoryIndex === null) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeStoryIndex < stories.length - 1) {
            setActiveStoryIndex(activeStoryIndex + 1);
            return 0;
          } else {
            setActiveStoryIndex(null);
            return 0;
          }
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [activeStoryIndex, stories.length]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaFile(file);
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview(previewUrl);
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
      const updated = await removeStory(storyId);
      setStories(updated);
      setActiveStoryIndex(null);
    } catch {
      window.alert('Could not delete this status. Please try again.');
    }
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim() && !mediaFile) return;

    setUploading(true);
    let uploadedUrl: string | undefined = undefined;

    try {
      if (mediaFile) {
        const res = await api.uploadFile(mediaFile);
        uploadedUrl = res.fileUrl;
      }

      const updated = await postStory({
        content: newContent.trim(),
        mediaUrl: uploadedUrl,
        backgroundGradient: selectedGradient,
      });
      setStories(updated);
      setNewContent('');
      setMediaFile(null);
      setMediaPreview(null);
      setIsCreating(false);
    } catch {
      window.alert('Could not post your status. Please check your connection and try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*,video/*"
        style={{ display: 'none' }}
      />

      {/* Fullscreen Story Viewer */}
      {activeStoryIndex !== null ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.92)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setActiveStoryIndex(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '430px',
              height: '740px',
              borderRadius: '24px',
              background: stories[activeStoryIndex].mediaUrl
                ? '#000000'
                : stories[activeStoryIndex].backgroundGradient,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Progress Bars */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '4px' }}>
              {stories.map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '3px',
                    flex: 1,
                    background: 'rgba(255, 255, 255, 0.35)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: i < activeStoryIndex ? '100%' : i === activeStoryIndex ? `${progress}%` : '0%',
                      background: '#fff',
                      transition: i === activeStoryIndex ? 'width 0.1s linear' : 'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Author Meta */}
            <div
              style={{
                position: 'absolute',
                top: '28px',
                left: '16px',
                right: '16px',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: '#fff',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)',
                padding: '6px 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {stories[activeStoryIndex].user.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>
                    {stories[activeStoryIndex].user.displayName}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8 }}>
                    {stories[activeStoryIndex].createdAt}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {stories[activeStoryIndex].user.id === currentUser.id && (
                  <button
                    onClick={() => handleDeleteStory(stories[activeStoryIndex].id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.45)',
                      border: 'none',
                      color: '#fff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Delete status update"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <button
                  onClick={() => setActiveStoryIndex(null)}
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    border: 'none',
                    color: '#fff',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Story Content: Media Photo OR Text */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {stories[activeStoryIndex].mediaUrl ? (
                <img
                  src={stories[activeStoryIndex].mediaUrl}
                  alt="Status update"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: '#fff',
                    fontSize: '22px',
                    fontWeight: 700,
                    lineHeight: '1.5',
                  }}
                >
                  {stories[activeStoryIndex].content}
                </div>
              )}
            </div>

            {/* Bottom Caption Pill (if media) & Views */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '16px 20px',
                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                color: '#fff',
              }}
            >
              {stories[activeStoryIndex].mediaUrl && stories[activeStoryIndex].content && (
                <div
                  style={{
                    background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 16px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    marginBottom: '12px',
                    textAlign: 'center',
                  }}
                >
                  {stories[activeStoryIndex].content}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', opacity: 0.9 }}>
                  <Eye size={16} /> {stories[activeStoryIndex].views} views
                </div>
                <button
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: '#fff',
                    padding: '6px 14px',
                    borderRadius: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                  }}
                >
                  <Heart size={14} /> React
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Status List / Create Modal */
        <div className="modal-content" style={{ maxWidth: '480px' }}>
          <div className="modal-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Camera size={20} />
              </div>
              <div>
                <h2 className="modal-title">Status & 24h Stories</h2>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Share photos, video highlights, and company announcements
                </p>
              </div>
            </div>
            <button className="icon-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          {isCreating ? (
            <form onSubmit={handlePostStory} style={{ padding: '4px 0' }}>
              {/* Mode switch */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  type="button"
                  onClick={() => setCreateMode('media')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: createMode === 'media' ? 'var(--accent-primary)' : 'var(--border-default)',
                    background: createMode === 'media' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-glass)',
                    color: createMode === 'media' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <ImageIcon size={16} /> Photo / Media
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('text')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: '1px solid',
                    borderColor: createMode === 'text' ? 'var(--accent-primary)' : 'var(--border-default)',
                    background: createMode === 'text' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-glass)',
                    color: createMode === 'text' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Type size={16} /> Text & Gradient
                </button>
              </div>

              {createMode === 'media' ? (
                /* Media Upload Box */
                <div style={{ marginBottom: '16px' }}>
                  {mediaPreview ? (
                    <div style={{ position: 'relative', height: '200px', borderRadius: '14px', overflow: 'hidden', marginBottom: '12px' }}>
                      <img src={mediaPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => {
                          setMediaFile(null);
                          setMediaPreview(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        height: '160px',
                        borderRadius: '14px',
                        border: '2px dashed var(--border-default)',
                        background: 'var(--bg-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        marginBottom: '12px',
                      }}
                    >
                      <Upload size={28} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Upload Photo or Graphic
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        PNG, JPG, GIF up to 25MB
                      </span>
                    </div>
                  )}

                  <input
                    type="text"
                    className="form-input"
                    placeholder="Add a caption..."
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    style={{ height: '42px', fontSize: '13.5px' }}
                  />
                </div>
              ) : (
                /* Text Gradient Box */
                <div style={{ marginBottom: '16px' }}>
                  <div
                    style={{
                      height: '140px',
                      borderRadius: '14px',
                      background: selectedGradient,
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '14px',
                    }}
                  >
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder="Type a corporate announcement or status..."
                      maxLength={120}
                      required
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        resize: 'none',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Select Theme Gradient:
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {GRADIENTS.map((g, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedGradient(g)}
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: g,
                          cursor: 'pointer',
                          border: selectedGradient === g ? '2px solid #fff' : '2px solid transparent',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsCreating(false)}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploading || (!newContent.trim() && !mediaFile)}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Sparkles size={16} /> {uploading ? 'Publishing...' : 'Publish Status'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              {/* My Status Card */}
              <div
                onClick={() => setIsCreating(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: 'var(--bg-card-hover)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                  marginBottom: '18px',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '50%',
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Add Status Update
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Upload photo, flyer, or type corporate update
                  </div>
                </div>
              </div>

              {/* Recent Updates List */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Recent Team Updates ({stories.length})
              </div>

              {stories.length === 0 ? (
                <div style={{ padding: '28px 16px', textAlign: 'center', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <Camera size={32} style={{ color: 'var(--text-muted)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    No Status Updates Yet
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Tap "Add Status Update" above to upload the first photo or team announcement.
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {stories.map((story, i) => (
                  <div
                    key={story.id}
                    onClick={() => setActiveStoryIndex(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-default)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        padding: '2px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #10b981 0%, #3b82f6 100%)',
                      }}
                    >
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--bg-secondary)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '15px',
                        }}
                      >
                        {story.user.displayName.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {story.user.displayName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {story.mediaUrl ? '📷 Photo Status' : story.content}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {story.createdAt}
                      </span>
                      {story.user.id === currentUser.id && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStory(story.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                          }}
                          title="Delete status update"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
