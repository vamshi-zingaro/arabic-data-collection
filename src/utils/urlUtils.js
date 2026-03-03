/**
 * Normalizes video URLs to a standard format for duplicate detection
 * Handles YouTube, Vimeo, and other common video platforms
 */
export function normalizeVideoUrl(url) {
  try {
    const urlObj = new URL(url.trim());

    // Handle YouTube URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return normalizeYouTubeUrl(urlObj);
    }

    // Handle Vimeo URLs
    if (urlObj.hostname.includes('vimeo.com')) {
      return normalizeVimeoUrl(urlObj);
    }

    // For other URLs, just return hostname + pathname (strip query params and fragments)
    return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
  } catch {
    // If URL parsing fails, return the trimmed lowercase version
    return url.trim().toLowerCase();
  }
}

/**
 * Normalize YouTube URLs to a consistent format
 * Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID
 */
function normalizeYouTubeUrl(urlObj) {
  let videoId = null;

  // youtu.be/VIDEO_ID format
  if (urlObj.hostname === 'youtu.be') {
    videoId = urlObj.pathname.slice(1).split('/')[0];
  }
  // youtube.com/watch?v=VIDEO_ID format
  else if (urlObj.pathname === '/watch') {
    videoId = urlObj.searchParams.get('v');
  }
  // youtube.com/shorts/VIDEO_ID format
  else if (urlObj.pathname.startsWith('/shorts/')) {
    videoId = urlObj.pathname.replace('/shorts/', '').split('/')[0];
  }
  // youtube.com/embed/VIDEO_ID format
  else if (urlObj.pathname.startsWith('/embed/')) {
    videoId = urlObj.pathname.replace('/embed/', '').split('/')[0];
  }
  // youtube.com/v/VIDEO_ID format
  else if (urlObj.pathname.startsWith('/v/')) {
    videoId = urlObj.pathname.replace('/v/', '').split('/')[0];
  }

  if (videoId) {
    return `youtube.com/watch?v=${videoId}`;
  }

  return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
}

/**
 * Normalize Vimeo URLs
 */
function normalizeVimeoUrl(urlObj) {
  // Extract video ID from path like /123456789
  const match = urlObj.pathname.match(/^\/(\d+)/);
  if (match) {
    return `vimeo.com/${match[1]}`;
  }
  return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
}

/**
 * Create a simple hash from a string for fast lookups
 * Uses a basic hash function suitable for our use case
 */
export function createUrlHash(normalizedUrl) {
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate if a string is a valid URL
 */
export function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Extract display-friendly info from URL
 */
export function getUrlDisplayInfo(url) {
  try {
    const urlObj = new URL(url);
    let platform = 'Video';

    if (urlObj.hostname.includes('youtube') || urlObj.hostname.includes('youtu.be')) {
      platform = 'YouTube';
    } else if (urlObj.hostname.includes('vimeo')) {
      platform = 'Vimeo';
    } else if (urlObj.hostname.includes('tiktok')) {
      platform = 'TikTok';
    } else if (urlObj.hostname.includes('twitter') || urlObj.hostname.includes('x.com')) {
      platform = 'X/Twitter';
    } else if (urlObj.hostname.includes('instagram')) {
      platform = 'Instagram';
    }

    return { platform, hostname: urlObj.hostname };
  } catch {
    return { platform: 'Link', hostname: '' };
  }
}

/**
 * Parse a duration string (MM:SS or HH:MM:SS) into total seconds.
 * Returns 0 for invalid input.
 */
export function parseDuration(str) {
  if (!str || typeof str !== 'string') return 0;
  const parts = str.split(':').map(Number);
  if (parts.some(isNaN)) return 0;

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  return 0;
}

/**
 * Format total seconds into a display string.
 * Returns "M:SS" for < 1 hour, "H:MM:SS" for >= 1 hour.
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a human-readable hours summary from total seconds.
 * e.g. 5025 → "1h 23m", 90 → "1m 30s"
 */
export function formatHoursSummary(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);

  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

