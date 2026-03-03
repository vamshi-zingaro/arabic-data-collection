"use client";

import { Toaster } from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import { useVideos } from "@/hooks/useVideos";
import { formatHoursSummary } from "@/utils/urlUtils";
import AddVideoForm from "@/components/AddVideoForm";
import VideoList from "@/components/VideoList";

export default function VideoApp() {
  const { videos, loading, error, addVideo, deleteVideo, checkDuplicate } =
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
        <h1>Najdi Video Tracker</h1>
        <div className="header-stats">
          <span className="header-count">{videos.length} videos</span>
          {videos.length > 0 && (
            <>
              <span className="header-dot" />
              <span className="header-count">{formatHoursSummary(videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0))}</span>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="sidebar">
          <AddVideoForm onAdd={addVideo} onCheckDuplicate={checkDuplicate} videos={videos} />
        </div>
        <VideoList videos={videos} loading={loading} onDelete={deleteVideo} />
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <span className="footer-dot" />
          <span>Connected to Firestore</span>
        </div>
      </footer>
    </div>
  );
}
