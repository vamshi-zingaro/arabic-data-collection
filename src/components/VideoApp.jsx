"use client";

import { Toaster } from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { useVideos } from "@/hooks/useVideos";
import { formatHoursSummary } from "@/utils/urlUtils";
import AddVideoForm from "@/components/AddVideoForm";
import VideoList from "@/components/VideoList";

export default function VideoApp() {
  const { videos, loading, refreshing, loadingMore, hasMore, totalCount, totalDurationSeconds, contributorStats, loadMore, loadStats, refresh, error, addVideo, deleteVideo, checkDuplicate } =
    useVideos();

  if (error) {
    return (
      <div className="app">
        <div className="error-container">
          <div className="error-icon"><AlertTriangle size={48} /></div>
          <h2>Connection Error</h2>
          <p>{error}</p>
          <p>Please check your Firebase configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#fff",
            fontSize: "0.875rem",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />

      <header className="app-header">
        <h1>TTS Data Tracker</h1>
        <div className="header-stats">
          <span className="header-count">{totalCount} videos</span>
          {totalDurationSeconds > 0 && (
            <>
              <span className="header-dot" />
              <span className="header-count">{formatHoursSummary(totalDurationSeconds)}</span>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="sidebar">
          <AddVideoForm onAdd={addVideo} onCheckDuplicate={checkDuplicate} totalDurationSeconds={totalDurationSeconds} contributorStats={contributorStats} onLoadStats={loadStats} />
        </div>
        <VideoList videos={videos} loading={loading} refreshing={refreshing} loadingMore={loadingMore} hasMore={hasMore} totalCount={totalCount} onLoadMore={loadMore} onRefresh={refresh} onDelete={deleteVideo} />
      </main>
    </div>
  );
}
