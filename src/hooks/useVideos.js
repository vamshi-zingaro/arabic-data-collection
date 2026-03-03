"use client";

import { useState, useEffect, useCallback } from "react";

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos");
      if (!res.ok) throw new Error("Failed to load videos");
      const data = await res.json();
      setVideos(data.videos);
      setError(null);
    } catch (err) {
      console.error("Error loading videos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const checkDuplicate = async (url) => {
    const res = await fetch("/api/videos/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error("Failed to check URL");
    return res.json();
  };

  const addVideo = async (url, addedBy = "", notes = "", extra = {}) => {
    const res = await fetch("/api/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        addedBy,
        notes,
        source: extra.source || "",
        durationSeconds: extra.durationSeconds || 0,
        dialect: extra.dialect || "Najdi",
      }),
    });

    const data = await res.json();

    if (res.status === 409) {
      return { success: false, isDuplicate: true, existingVideo: data.existingVideo };
    }

    if (!res.ok) throw new Error(data.error || "Failed to add video");

    // Add the new video to local state immediately
    if (data.video) {
      setVideos((prev) => [data.video, ...prev]);
    }

    return { success: true, id: data.id };
  };

  const deleteVideo = async (videoId) => {
    const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete video");

    // Remove from local state immediately
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  return {
    videos,
    loading,
    error,
    addVideo,
    deleteVideo,
    checkDuplicate,
  };
}
