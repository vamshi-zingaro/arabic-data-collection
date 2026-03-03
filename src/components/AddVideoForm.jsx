"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Plus, Check, CircleCheck, ArrowLeft, Loader2, User, Clock } from "lucide-react";
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

export default function AddVideoForm({ onAdd, onCheckDuplicate, videos = [] }) {
  const [url, setUrl] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [source, setSource] = useState("YouTube");
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateVideo, setDuplicateVideo] = useState(null);
  const [step, setStep] = useState(1);

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

    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
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
    setHours(0);
    setMinutes(0);
    setSeconds(0);
    setStep(1);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleCloseDuplicateWarning = () => {
    setDuplicateVideo(null);
  };

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
                  <span className="duration-label">hours</span>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={hours}
                    onChange={(e) => setHours(Math.max(0, Math.min(99, parseInt(e.target.value) || 0)))}
                    disabled={isSubmitting}
                  />
                </div>
                <span className="duration-colon">:</span>
                <div className="duration-field">
                  <span className="duration-label">minutes</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                    disabled={isSubmitting}
                  />
                </div>
                <span className="duration-colon">:</span>
                <div className="duration-field">
                  <span className="duration-label">seconds</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={String(seconds).padStart(2, "0")}
                    onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
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
            <span className="stats-total-value">{formatHoursSummary(videos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0))}</span>
            <span className="stats-total-label">total collected</span>
          </div>
          <h3><User size={15} /> Contributions</h3>
          <div className="contributor-list">
            {CONTRIBUTORS.map((name) => {
              const userVideos = videos.filter((v) => v.addedBy === name);
              const count = userVideos.length;
              const totalSec = userVideos.reduce((sum, v) => sum + (v.durationSeconds || 0), 0);
              return (
                <div key={name} className="contributor-row">
                  <span className="contributor-name">{name}</span>
                  <div className="contributor-bar-track">
                    <div
                      className="contributor-bar-fill"
                      style={{ width: `${videos.length ? (count / videos.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="contributor-count">{count}</span>
                  <span className="contributor-hours"><Clock size={11} /> {formatHoursSummary(totalSec)}</span>
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
