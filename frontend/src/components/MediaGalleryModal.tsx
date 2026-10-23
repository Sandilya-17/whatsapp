import React, { useState } from 'react';
import { X, Image as ImageIcon, FileText, Link, Download, ExternalLink } from 'lucide-react';
import type { Message } from '../types';

interface MediaGalleryModalProps {
  chatTitle: string;
  messages: Message[];
  onClose: () => void;
}

export const MediaGalleryModal: React.FC<MediaGalleryModalProps> = ({
  chatTitle,
  messages,
  onClose,
}) => {
  const [tab, setTab] = useState<'media' | 'docs' | 'links'>('media');
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Filter messages
  const mediaItems = messages.filter((m) => m.mediaUrl && (m.messageType === 'IMAGE' || m.messageType === 'VIDEO'));
  const docItems = messages.filter((m) => m.mediaUrl && m.messageType === 'FILE');

  // Extract URLs from text messages
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const linkItems = messages
    .filter((m) => m.content && urlRegex.test(m.content))
    .flatMap((m) => {
      const urls = m.content.match(urlRegex) || [];
      return urls.map((url) => ({
        url,
        sender: m.sender.displayName,
        createdAt: m.createdAt,
      }));
    });

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Media, Links & Docs
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{chatTitle}</span>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="sidebar-tabs" style={{ padding: '8px 16px 0', background: 'var(--bg-secondary)' }}>
          <button
            className={`tab-btn ${tab === 'media' ? 'active' : ''}`}
            onClick={() => setTab('media')}
          >
            <ImageIcon size={15} />
            <span>Media ({mediaItems.length})</span>
          </button>
          <button
            className={`tab-btn ${tab === 'docs' ? 'active' : ''}`}
            onClick={() => setTab('docs')}
          >
            <FileText size={15} />
            <span>Docs ({docItems.length})</span>
          </button>
          <button
            className={`tab-btn ${tab === 'links' ? 'active' : ''}`}
            onClick={() => setTab('links')}
          >
            <Link size={15} />
            <span>Links ({linkItems.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '20px', maxHeight: '420px', overflowY: 'auto' }}>
          {tab === 'media' && (
            <div>
              {mediaItems.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No photos or videos shared in this conversation yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                  {mediaItems.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setActiveImage(m.mediaUrl!)}
                      style={{
                        aspectRatio: '1',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: 'rgba(0,0,0,0.3)',
                        position: 'relative',
                      }}
                    >
                      <img
                        src={m.mediaUrl}
                        alt="Shared"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'docs' && (
            <div>
              {docItems.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No documents shared in this conversation yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {docItems.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-default)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            background: 'rgba(0, 168, 132, 0.15)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {m.mediaFileName || 'Document'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {m.sender.displayName} • {new Date(m.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <a
                        href={m.mediaUrl}
                        download
                        style={{
                          color: 'var(--accent-primary)',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'links' && (
            <div>
              {linkItems.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No web links shared in this conversation yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {linkItems.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-default)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ overflow: 'hidden' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: '13px',
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {item.url}
                          </span>
                          <ExternalLink size={13} style={{ flexShrink: 0 }} />
                        </a>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Shared by {item.sender} • {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Image Lightbox */}
        {activeImage && (
          <div
            onClick={() => setActiveImage(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              zIndex: 999999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: 'zoom-out',
            }}
          >
            <img
              src={activeImage}
              alt="Enlarged"
              style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
