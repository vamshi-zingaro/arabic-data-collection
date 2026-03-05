"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Check, CircleCheck, ArrowLeft, Loader2, Clock, BarChart3, Calendar } from "lucide-react";
import { isValidUrl, getUrlDisplayInfo, formatHoursSummary, extractYouTubeVideoId } from "@/utils/urlUtils";
import DuplicateWarning from "@/components/DuplicateWarning";

const CONTRIBUTORS = ["Jakeer", "Sami", "Afreen"];

const SOURCES = [
  "YouTube",
  "Vimeo",
  "TikTok",
  "Instagram",
  "X/Twitter",
  "Facebook",
  "Other",
];

export default function AddVideoForm({ onAdd, onCheckDuplicate, totalDurationSeconds = 0, contributorStats = {}, onLoadStats }) {
  const [url, setUrl] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [source, setSource] = useState("YouTube");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [speakers, setSpeakers] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingDuration, setIsFetchingDuration] = useState(false);
  const [durationAutoFetched, setDurationAutoFetched] = useState(false);
  const [channel, setChannel] = useState("");
  const [duplicateVideo, setDuplicateVideo] = useState(null);
  const [step, setStep] = useState(1);
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState("");

  // Reload stats when date filter changes
  useEffect(() => {
    if (onLoadStats) {
      onLoadStats(dateFilter, customDate);
    }
  }, [dateFilter, customDate, onLoadStats]);

  const fetchDurationViaIFrame = (videoId) => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), 12000);

      const loadPlayer = () => {
        let container = document.getElementById("yt-hidden-player");
        if (!container) {
          container = document.createElement("div");
          container.id = "yt-hidden-player";
          container.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
          document.body.appendChild(container);
        }
        container.innerHTML = '<div id="yt-temp-player"></div>';

        const player = new window.YT.Player("yt-temp-player", {
          videoId,
          playerVars: { autoplay: 0 },
          events: {
            onReady: (event) => {
              const dur = event.target.getDuration();
              const videoData = event.target.getVideoData();
              clearTimeout(timeout);
              player.destroy();
              resolve({ duration: dur, channel: videoData?.author || null });
            },
            onError: () => {
              clearTimeout(timeout);
              player.destroy();
              reject(new Error("player error"));
            },
          },
        });
      };

      if (window.YT && window.YT.Player) {
        loadPlayer();
      } else {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prev) prev();
          loadPlayer();
        };
        document.head.appendChild(tag);
      }
    });
  };

  const fetchDuration = async (videoUrl) => {
    const videoId = extractYouTubeVideoId(videoUrl);
    if (!videoId) return;

    setIsFetchingDuration(true);

    // Try server-side API first
    try {
      const res = await fetch("/api/videos/duration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: videoUrl }),
      });
      const data = await res.json();
      if (data.duration && data.duration > 0) {
        const h = Math.floor(data.duration / 3600);
        const m = Math.floor((data.duration % 3600) / 60);
        const s = data.duration % 60;
        setHours(h > 0 ? String(h) : "");
        setMinutes(String(m));
        setSeconds(String(s));
        setDurationAutoFetched(true);
        if (data.channel) setChannel(data.channel);
        toast.success("Duration auto-detected!");
        setIsFetchingDuration(false);
        return;
      }
    } catch {
      // Server failed, try client-side
    }

    // Fallback: client-side YouTube IFrame Player API
    try {
      const result = await fetchDurationViaIFrame(videoId);
      if (result.duration && result.duration > 0) {
        const h = Math.floor(result.duration / 3600);
        const m = Math.floor((result.duration % 3600) / 60);
        const s = Math.round(result.duration % 60);
        setHours(h > 0 ? String(h) : "");
        setMinutes(String(m));
        setSeconds(String(s));
        setDurationAutoFetched(true);
        if (result.channel) setChannel(result.channel);
        toast.success("Duration auto-detected!");
      }
    } catch {
      // Both failed — user enters manually
    } finally {
      setIsFetchingDuration(false);
    }
  };

  const handleUrlCheck = async (e) => {
    e.preventDefault();

    if (!url.trim()) {
      toast.error("Please enter a video URL");
      return;
    }

    if (!isValidUrl(url)) {
      toast.error("Please enter a valid URL");
      return;
    }

    // Block playlist and channel URLs
    try {
      const urlObj = new URL(url.trim());
      const isYT = urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be");
      if (isYT) {
        if (urlObj.pathname === "/playlist" || urlObj.searchParams.has("list")) {
          toast.error("Playlist URLs are not supported. Please add individual video URLs.");
          return;
        }
        if (urlObj.pathname.startsWith("/channel/") || urlObj.pathname.startsWith("/@") || urlObj.pathname.startsWith("/c/")) {
          toast.error("Channel URLs are not supported. Please add individual video URLs.");
          return;
        }
      }
    } catch { /* ignore parse errors, let it proceed */ }

    setIsChecking(true);

    try {
      const { isDuplicate, existingVideo } = await onCheckDuplicate(url);

      if (isDuplicate) {
        setDuplicateVideo(existingVideo);
        setIsChecking(false);
        return;
      }

      const { platform } = getUrlDisplayInfo(url);
      if (platform !== "Video" && platform !== "Link") {
        setSource(platform);
      }

      toast.success("URL verified! Fill in the details.");
      setStep(2);

      // Auto-fetch duration for YouTube URLs
      if (extractYouTubeVideoId(url)) {
        fetchDuration(url);
      }
    } catch (error) {
      toast.error("Failed to check URL: " + error.message);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!addedBy) {
      toast.error("Please select who is adding this video");
      return;
    }

    if (!source) {
      toast.error("Please select the video source");
      return;
    }

    const totalSeconds = (parseInt(hours, 10) || 0) * 3600 + (parseInt(minutes, 10) || 0) * 60 + (parseInt(seconds, 10) || 0);
    if (totalSeconds === 0) {
      toast.error("Please enter the video duration");
      return;
    }

    if (!speakers || parseInt(speakers, 10) < 1) {
      toast.error("Please enter the number of speakers");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onAdd(url, addedBy, "", {
        source,
        durationSeconds: totalSeconds,
        dialect: "Najdi",
        speakers: parseInt(speakers, 10) || 1,
        channel: channel || "",
      });

      if (result.success) {
        toast.success("Video added successfully!");
        resetForm();
        // Refresh stats after adding
        if (onLoadStats) onLoadStats(dateFilter, customDate);
      } else if (result.isDuplicate) {
        setDuplicateVideo(result.existingVideo);
      }
    } catch (error) {
      toast.error("Failed to add video: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setUrl("");
    setAddedBy("");
    setSource("");
    setHours("");
    setMinutes("");
    setSeconds("");
    setSpeakers("");
    setChannel("");
    setDurationAutoFetched(false);
    setIsFetchingDuration(false);
    setStep(1);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCloseDuplicateWarning = () => {
    setDuplicateVideo(null);
  };

  // Calculate total count from contributor stats for progress bar
  const totalFiltered = Object.values(contributorStats).reduce((sum, s) => sum + s.count, 0);

  return (
    <>
      <div className="add-video-form">
        <h2><Plus size={18} /> Add New Video</h2>

        {/* Step indicator */}
        <div className="step-indicator">
          <div className={`step ${step >= 1 ? "active" : ""} ${step > 1 ? "completed" : ""}`}>
            <span className="step-number">{step > 1 ? <Check size={14} /> : "1"}</span>
            <span className="step-label">URL</span>
          </div>
          <div className={`step-line ${step >= 2 ? "active" : ""}`} />
          <div className={`step ${step >= 2 ? "active" : ""}`}>
            <span className="step-number">2</span>
            <span className="step-label">Details</span>
          </div>
        </div>

        {step === 1 && (
          <form onSubmit={handleUrlCheck} className="fade-in">
            <div className="form-group">
              <label htmlFor="url">Paste video URL</label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                disabled={isChecking}
                autoFocus
              />
            </div>

            <button type="submit" disabled={isChecking} className="submit-btn">
              {isChecking ? (
                <>
                  <Loader2 size={16} className="icon-spin" />
                  Checking...
                </>
              ) : (
                "Check URL"
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="fade-in">
            <div className="url-preview">
              <span className="url-check-icon"><CircleCheck size={20} /></span>
              <div className="url-preview-text">
                <span className="url-preview-label">Verified URL</span>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url.length > 50 ? url.substring(0, 50) + "..." : url}
                </a>
              </div>
            </div>

            {channel && (
              <div className="form-group">
                <label>Channel</label>
                <input type="text" value={channel} disabled className="channel-input" />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="addedBy">Added By *</label>
              <select
                id="addedBy"
                value={addedBy}
                onChange={(e) => setAddedBy(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select person</option>
                {CONTRIBUTORS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="source">Source *</label>
              <select
                id="source"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select source</option>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>
                Duration *
                {isFetchingDuration && (
                  <span className="duration-fetching">
                    <Loader2 size={14} className="icon-spin" /> Auto-detecting...
                  </span>
                )}
                {durationAutoFetched && !isFetchingDuration && (
                  <span className="duration-auto-badge">
                    <Check size={12} /> Auto-detected
                  </span>
                )}
              </label>
              <div className="duration-picker">
                <div className="duration-field">
                  <span className="duration-label">hrs</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="0"
                    value={hours}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setHours(v);
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                <span className="duration-colon">:</span>
                <div className="duration-field">
                  <span className="duration-label">min</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="00"
                    value={minutes}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setMinutes(v);
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                <span className="duration-colon">:</span>
                <div className="duration-field">
                  <span className="duration-label">sec</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="00"
                    value={seconds}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setSeconds(v);
                    }}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="speakers">Number of Speakers *</label>
              <input
                type="number"
                id="speakers"
                min={1}
                max={99}
                placeholder="1"
                value={speakers}
                onChange={(e) => setSpeakers(e.target.value.replace(/\D/g, "").slice(0, 2))}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={handleBack}
                className="back-btn"
                disabled={isSubmitting}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="submit-btn"
              >
                {isSubmitting ? "Adding..." : "Add Video"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="contributor-stats">
          <div className="stats-total">
            <Clock size={16} />
            <span className="stats-total-label">Total Duration:</span>
            <span className="stats-total-value">{formatHoursSummary(totalDurationSeconds)}</span>
          </div>

          <div className="stats-filter-row">
            <h3><Calendar size={15} /> Contributions</h3>
            <div className="date-filters">
              {[
                { key: "today", label: "Today" },
                { key: "week", label: "Week" },
                { key: "month", label: "Month" },
                { key: "all", label: "All" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`date-filter-btn ${dateFilter === f.key ? "active" : ""}`}
                  onClick={() => setDateFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="custom-date-row">
            <Calendar size={14} className="custom-date-icon" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDateFilter("custom");
              }}
              className="custom-date-input"
            />
            {dateFilter === "custom" && customDate && (
              <span className="custom-date-label">
                {new Date(customDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          <div className="contributor-list">
            {CONTRIBUTORS.map((name) => {
              const stat = contributorStats[name] || { count: 0, totalSeconds: 0 };
              return (
                <div key={name} className="contributor-row">
                  <span className="contributor-count"><BarChart3 size={11} /> {stat.count}</span>
                  <span className="contributor-name">{name}</span>
                  <div className="contributor-bar-track">
                    <div
                      className="contributor-bar-fill"
                      style={{ width: `${totalFiltered ? (stat.count / totalFiltered) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="contributor-hours"><Clock size={11} /> {formatHoursSummary(stat.totalSeconds)}</span>
                </div>
              );
            })}
          </div>
        </div>

      {duplicateVideo && (
        <DuplicateWarning
          video={duplicateVideo}
          onClose={handleCloseDuplicateWarning}
        />
      )}
    </>
  );
}
