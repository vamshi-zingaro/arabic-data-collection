"use client";

import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { getUrlDisplayInfo } from '@/utils/urlUtils';

export default function DuplicateWarning({ video, onClose }) {
  const { platform } = getUrlDisplayInfo(video.url);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content duplicate-warning" onClick={(e) => e.stopPropagation()}>
        <div className="warning-icon"><AlertTriangle size={24} /></div>
        <h3>Duplicate Video Found</h3>
        <p>This video has already been added to the collection.</p>

        <div className="existing-video-info">
          <div className="info-row">
            <span className="label">Platform</span>
            <span className="value">{video.source || platform}</span>
          </div>
          <div className="info-row">
            <span className="label">Added by</span>
            <span className="value">{video.addedBy || 'Anonymous'}</span>
          </div>
          <div className="info-row">
            <span className="label">Added on</span>
            <span className="value">{formatDate(video.addedAt)}</span>
          </div>
          <div className="info-row">
            <span className="label">URL</span>
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="value link"
            >
              {video.url.length > 45 ? video.url.substring(0, 45) + '...' : video.url}
            </a>
          </div>
        </div>

        <button onClick={onClose} className="close-btn">
          Got it
        </button>
      </div>
    </div>,
    document.body
  );
}
