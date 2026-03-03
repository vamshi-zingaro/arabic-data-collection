"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const PAGE_SIZE = 50;

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [contributorStats, setContributorStats] = useState({});
  const cursorRef = useRef(null);

  const loadStats = useCallback(async (dateFilter = "all", customDate = "") => {
    try {
      const params = new URLSearchParams({ dateFilter });
      if (customDate) params.set("customDate", customDate);
      const res = await fetch(`/api/videos/stats?${params}`);
      if (!res.ok) throw new Error("Failed to load stats");
      const data = await res.json();
      setContributorStats(data.stats);
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch(`/api/videos?limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to load videos");
      const data = await res.json();
      setVideos(data.videos);
      cursorRef.current = data.nextCursor || null;
      setHasMore(!!data.nextCursor);
      if (data.totalCount != null) setTotalCount(data.totalCount);
      if (data.totalDurationSeconds != null) setTotalDurationSeconds(data.totalDurationSeconds);
      setError(null);
    } catch (err) {
      console.error("Error loading videos:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursorRef.current) return;

    setLoadingMore(true);
    try {
      const res = await fetch(`/api/videos?limit=${PAGE_SIZE}&cursor=${cursorRef.current}`);
      if (!res.ok) throw new Error("Failed to load more videos");
      const data = await res.json();
      setVideos((prev) => [...prev, ...data.videos]);
      cursorRef.current = data.nextCursor || null;
      setHasMore(!!data.nextCursor);
    } catch (err) {
      console.error("Error loading more videos:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  useEffect(() => {
    loadVideos();
    loadStats();
  }, [loadVideos, loadStats]);

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
        speakers: extra.speakers || 1,
      }),
    });

    const data = await res.json();

    if (res.status === 409) {
      return { success: false, isDuplicate: true, existingVideo: data.existingVideo };
    }

    if (!res.ok) throw new Error(data.error || "Failed to add video");

    // Add the new video to local state and update totals
    if (data.video) {
      setVideos((prev) => [data.video, ...prev]);
      setTotalCount((prev) => prev + 1);
      setTotalDurationSeconds((prev) => prev + (data.video.durationSeconds || 0));
    }

    return { success: true, id: data.id };
  };

  const deleteVideo = async (videoId) => {
    const res = await fetch(`/api/videos/${videoId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete video");

    // Find video before removing, then update all states separately
    const deleted = videos.find((v) => v.id === videoId);
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    if (deleted) {
      setTotalCount((c) => c - 1);
      setTotalDurationSeconds((d) => d - (deleted.durationSeconds || 0));
    }
  };

  return {
    videos,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    totalDurationSeconds,
    contributorStats,
    loadMore,
    loadStats,
    refresh: loadVideos,
    error,
    addVideo,
    deleteVideo,
    checkDuplicate,
  };
}
