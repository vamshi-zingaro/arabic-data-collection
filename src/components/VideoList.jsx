"use client";

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Film, Trash2, Copy, Check, Clock, Download } from 'lucide-react';
import { getUrlDisplayInfo, formatDuration } from '@/utils/urlUtils';
import SearchBar from '@/components/SearchBar';

export default function VideoList({ videos, loading, onDelete }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = useCallback(async (video) => {
    try {
      await navigator.clipboard.writeText(video.url);
      setCopiedId(video.id);
      toast.success('URL copied!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }, []);

  const filteredVideos = videos.filter((video) => {
    const search = searchTerm.toLowerCase();
    return (
      video.url.toLowerCase().includes(search) ||
      (video.addedBy && video.addedBy.toLowerCase().includes(search)) ||
      (video.source && video.source.toLowerCase().includes(search))
    );
  });

  const handleDelete = async (video) => {
    if (!confirm(`Delete this video?\n${video.url}`)) {
      return;
    }

    setDeletingId(video.id);
    try {
      await onDelete(video.id);
      toast.success('Video deleted');
    } catch (error) {
      toast.error('Failed to delete: ' + error.message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportCSV = () => {
    if (videos.length === 0) {
      toast.error('No videos to export');
      return;
    }

    const headers = ['URL', 'Source', 'Added By', 'Duration', 'Dialect', 'Added At'];
    const rows = videos.map((v) => {
      const date = v.addedAt
        ? (v.addedAt.toDate ? v.addedAt.toDate() : new Date(v.addedAt)).toISOString()
        : '';
      const duration = v.durationSeconds > 0 ? formatDuration(v.durationSeconds) : (v.duration || '');
      return [
        `"${(v.url || '').replace(/"/g, '""')}"`,
        v.source || '',
        v.addedBy || '',
        duration,
        v.dialect || '',
        date,
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `najdi-videos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${videos.length} videos`);
  };

  if (loading) {
    return (
      <div className="video-list">
        <div className="loading">
          <div className="spinner" />
          <p>Loading videos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="video-list">
      <div className="list-header">
        <h2>
          Video Collection
          <span className="video-count">{videos.length}</span>
          <button onClick={exportCSV} className="export-btn" title="Export as CSV">
            <Download size={15} /> Export
          </button>
        </h2>
        <SearchBar value={searchTerm} onChange={setSearchTerm} />
      </div>

      {filteredVideos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Film size={48} strokeWidth={1.5} /></div>
          {searchTerm ? (
            <p>No videos match your search</p>
          ) : (
            <>
              <p>No videos added yet</p>
              <p className="empty-sub">Add your first video using the form</p>
            </>
          )}
        </div>
      ) : (
        <div className="videos-grid">
          {filteredVideos.map((video) => {
            const { platform } = getUrlDisplayInfo(video.url);
            const displaySource = video.source || platform;
            return (
              <div key={video.id} className="video-card">
                <div className="video-card-row1">
                  <span className="platform-badge" data-source={displaySource}>
                    {displaySource}
                  </span>
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-url"
                    title={video.url}
                  >
                    {video.url}
                  </a>
                  <button
                    onClick={() => handleCopy(video)}
                    className="copy-btn"
                    aria-label="Copy URL"
                    title="Copy URL"
                  >
                    {copiedId === video.id ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                  <button
                    onClick={() => handleDelete(video)}
                    disabled={deletingId === video.id}
                    className="delete-btn"
                    aria-label="Delete video"
                  >
                    {deletingId === video.id ? '...' : <Trash2 size={14} />}
                  </button>
                </div>
                <div className="video-card-row2">
                  <span className="added-by">{video.addedBy}</span>
                  <span className="meta-dot" />
                  <span className="added-at">{formatDate(video.addedAt)}</span>
                  {(video.durationSeconds > 0 || video.duration) && (
                    <>
                      <span className="meta-dot" />
                      <span className="video-duration"><Clock size={12} /> {video.durationSeconds > 0 ? formatDuration(video.durationSeconds) : video.duration}</span>
                    </>
                  )}
                  {video.dialect && (
                    <span className="dialect-badge">{video.dialect}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
