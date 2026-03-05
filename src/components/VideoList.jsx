"use client";

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { Virtuoso } from 'react-virtuoso';
import { Film, Trash2, Copy, Check, Clock, Download, Loader2, RefreshCw, Users } from 'lucide-react';
import { FaYoutube, FaFacebook, FaInstagram, FaTiktok, FaVimeoV, FaXTwitter } from 'react-icons/fa6';

const SOURCE_ICONS = {
  YouTube: FaYoutube,
  Facebook: FaFacebook,
  Instagram: FaInstagram,
  TikTok: FaTiktok,
  Vimeo: FaVimeoV,
  "X/Twitter": FaXTwitter,
};
import { getUrlDisplayInfo, formatHoursSummary } from '@/utils/urlUtils';

export default function VideoList({ videos, loading, refreshing, loadingMore, hasMore, totalCount, nameFilter, onNameFilterChange, onLoadMore, onRefresh, onDelete }) {
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

  const [exporting, setExporting] = useState(false);

  const exportCSV = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/videos/export');
      if (!res.ok) throw new Error('Failed to fetch videos for export');
      const data = await res.json();
      const allVideos = data.videos;

      if (allVideos.length === 0) {
        toast.error('No videos to export');
        return;
      }

      const headers = ['URL', 'Source', 'Added By', 'Duration', 'Dialect', 'Speakers', 'Added At'];
      const rows = allVideos.map((v) => [
        `"${(v.url || '').replace(/"/g, '""')}"`,
        v.source || '',
        v.addedBy || '',
        v.duration || '',
        v.dialect || '',
        v.speakers || 1,
        v.addedAt || '',
      ].join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `najdi-videos-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      toast.success(`Exported ${allVideos.length} videos`);
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };


  if (loading) {
    return (
      <div className="video-list">
        <div className="list-header">
          <h2>Data Collection</h2>
        </div>
        <div className="videos-grid">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="video-card skeleton-card">
              <div className="skeleton-line skeleton-wide" />
              <div className="skeleton-line skeleton-narrow" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="video-list">
      <div className="list-header">
        <h2>
          Data Collection
          <span className="video-count">{totalCount}</span>
        </h2>
        <div className="list-header-actions">
          <button onClick={onRefresh} className="export-btn" title="Refresh list" disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'icon-spin' : ''} />
          </button>
          <button onClick={exportCSV} className="export-btn" title="Export as CSV" disabled={exporting}>
            {exporting ? <Loader2 size={15} className="icon-spin" /> : <Download size={15} />} {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
      <div className="list-search">
        <span className="name-filters">
          {['All', 'Jakeer', 'Sami', 'Afreen'].map((name) => (
            <button
              key={name}
              className={`name-filter-btn ${nameFilter === name ? 'active' : ''}`}
              onClick={() => onNameFilterChange(name)}
            >
              {name}
            </button>
          ))}
        </span>
      </div>

      {videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Film size={48} strokeWidth={1.5} /></div>
          <p>No videos added yet</p>
          <p className="empty-sub">Add your first video using the form</p>
        </div>
      ) : (
        <Virtuoso
          className="videos-grid"
          data={videos}
          overscan={200}
          endReached={() => {
            if (hasMore && !loadingMore) onLoadMore();
          }}
          components={{
            Footer: () =>
              loadingMore ? (
                <div className="load-more-spinner">
                  <Loader2 size={18} className="icon-spin" /> Loading more...
                </div>
              ) : null,
          }}
          itemContent={(_index, video) => {
            const { platform } = getUrlDisplayInfo(video.url);
            const displaySource = video.source || platform;
            return (
              <div className="video-card">
                <div className="video-card-row1">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="video-url"
                    title={video.url}
                  >
                    {video.url}
                  </a>
                  {(video.durationSeconds > 0 || video.duration) && (
                    <span className="video-duration"><Clock size={12} /> {video.durationSeconds > 0 ? formatHoursSummary(video.durationSeconds) : video.duration}</span>
                  )}
                  {(() => {
                    const Icon = SOURCE_ICONS[displaySource];
                    return (
                      <span className="platform-badge" data-source={displaySource} title={displaySource}>
                        {Icon ? <Icon size={14} /> : displaySource}
                      </span>
                    );
                  })()}
                  {video.dialect && (
                    <span className="dialect-badge">{video.dialect}</span>
                  )}
                  {video.speakers >= 1 && (
                    <span className="speakers-badge"><Users size={12} /> {video.speakers}</span>
                  )}
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
                  <span className="added-by" data-user={video.addedBy}>{video.addedBy}</span>
                  <span className="meta-dot" />
                  <span className="added-at">{formatDate(video.addedAt)}</span>
                  {video.channel && (
                    <>
                      <span className="meta-dot" />
                      <span className="channel-name">{video.channel}</span>
                    </>
                  )}
                </div>
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
