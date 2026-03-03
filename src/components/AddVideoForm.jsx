"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Plus, Check, CircleCheck, ArrowLeft, Loader2, Clock, BarChart3, Calendar } from "lucide-react";
import { isValidUrl, getUrlDisplayInfo, formatHoursSummary } from "@/utils/urlUtils";
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
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    setIsSubmitting(true);

    try {
      const result = await onAdd(url, addedBy, "", {
        source,
        durationSeconds: totalSeconds,
        dialect: "Najdi",
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
              <label>Duration *</label>
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
            <span className="stats-total-value">{formatHoursSummary(totalDurationSeconds)}</span>
            <span className="stats-total-label">total collected</span>
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
