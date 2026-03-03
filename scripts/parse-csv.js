import { readFileSync, writeFileSync } from 'fs';

// ---- URL utilities (same logic as src/utils/urlUtils.js) ----
function normalizeVideoUrl(url) {
  try {
    const urlObj = new URL(url.trim());
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = null;
      if (urlObj.hostname === 'youtu.be') {
        videoId = urlObj.pathname.slice(1).split('/')[0];
      } else if (urlObj.pathname === '/watch') {
        videoId = urlObj.searchParams.get('v');
      } else if (urlObj.pathname.startsWith('/shorts/')) {
        videoId = urlObj.pathname.replace('/shorts/', '').split('/')[0];
      } else if (urlObj.pathname.startsWith('/embed/')) {
        videoId = urlObj.pathname.replace('/embed/', '').split('/')[0];
      } else if (urlObj.pathname.startsWith('/v/')) {
        videoId = urlObj.pathname.replace('/v/', '').split('/')[0];
      }
      if (videoId) return `youtube.com/watch?v=${videoId}`;
      return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
    }
    if (urlObj.hostname.includes('vimeo.com')) {
      const match = urlObj.pathname.match(/^\/(\d+)/);
      if (match) return `vimeo.com/${match[1]}`;
    }
    return `${urlObj.hostname}${urlObj.pathname}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

function createUrlHash(normalizedUrl) {
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// ---- CSV parsing (handles quoted fields with commas) ----
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

// ---- Normalize duration: "01.30.23" or "01:30:23" → "01:30:23" ----
function normalizeDuration(raw) {
  if (!raw) return '';
  let d = raw.trim().replace(/\s+/g, '');
  // Remove trailing dots like "01.07.51."
  d = d.replace(/\.+$/, '');
  // Remove leading dots like ".01.02.33"
  d = d.replace(/^\.+/, '');
  // Replace dots with colons
  d = d.replace(/\./g, ':');
  // Validate it looks like a duration
  if (/^\d{1,2}(:\d{2}){1,2}$/.test(d)) return d;
  return d || '';
}

// ---- Fix common URL issues ----
function fixUrl(raw) {
  if (!raw) return null;
  let url = raw.trim();
  if (!url) return null;
  // Add https:// if missing
  if (url.startsWith('youtube.com') || url.startsWith('youtu.be')) {
    url = 'https://' + url;
  }
  // Fix http:// to https://
  if (url.startsWith('http://')) {
    url = url.replace('http://', 'https://');
  }
  // Must start with http
  if (!url.startsWith('http')) return null;
  return url;
}

// ---- Parse each file ----
function parseAfreen(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = [];

  // Skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    // Columns: Dialect, website, source link, number of speakers, duration, (notes)
    const url = fixUrl(fields[2]);
    if (!url) continue;

    const notes = fields[5] || '';
    const speakers = fields[3] || '';
    const duration = normalizeDuration(fields[4]);

    results.push({
      url,
      addedBy: 'Afreen',
      source: 'YouTube',
      dialect: 'Najdi',
      duration,
      speakers,
      notes,
    });
  }
  return results;
}

function parseJakeer(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = [];

  // Skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    // Columns: Dialect, website, source link, number of speakers, duration
    const url = fixUrl(fields[2]);
    if (!url) continue;

    const speakers = fields[3] || '';
    const duration = normalizeDuration(fields[4]);

    results.push({
      url,
      addedBy: 'Jakeer',
      source: 'YouTube',
      dialect: 'Najdi',
      duration,
      speakers,
      notes: '',
    });
  }
  return results;
}

function parseSami(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const results = [];

  // Skip header row (line 0)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const fields = parseCSVLine(line);
    // Columns: Dialect, Website, Source link, Duration
    const url = fixUrl(fields[2]);
    if (!url) continue;

    const duration = normalizeDuration(fields[3]);

    results.push({
      url,
      addedBy: 'Sami',
      source: 'YouTube',
      dialect: 'Najdi',
      duration,
      speakers: '',
      notes: '',
    });
  }
  return results;
}

// ---- Main ----
const afreenData = parseAfreen('/home/jakeer/Downloads/Saudi Dialect TTS Data Collection - afrin.csv');
const jakeerData = parseJakeer('/home/jakeer/Downloads/Saudi Dialect TTS Data Collection - jakir.csv');
const samiData = parseSami('/home/jakeer/Downloads/Saudi Dialect TTS Data Collection - sami.csv');

console.log(`Parsed: Afreen=${afreenData.length}, Jakeer=${jakeerData.length}, Sami=${samiData.length}`);

// Combine all and deduplicate by normalized URL
const allVideos = [...afreenData, ...jakeerData, ...samiData];
const seen = new Map(); // normalized → { addedBy, url }
const deduped = [];
const dupes = { Afreen: [], Jakeer: [], Sami: [] };

for (const video of allVideos) {
  const normalized = normalizeVideoUrl(video.url);
  const hash = createUrlHash(normalized);

  if (seen.has(normalized)) {
    const orig = seen.get(normalized);
    dupes[video.addedBy].push({
      url: video.url,
      alreadyAddedBy: orig.addedBy,
    });
    continue;
  }
  seen.set(normalized, { addedBy: video.addedBy, url: video.url });

  deduped.push({
    url: video.url,
    normalizedUrl: normalized,
    urlHash: hash,
    addedBy: video.addedBy,
    notes: video.notes,
    source: video.source,
    duration: video.duration,
    dialect: video.dialect,
    speakers: video.speakers,
  });
}

const totalDupes = dupes.Afreen.length + dupes.Jakeer.length + dupes.Sami.length;
console.log(`Total: ${allVideos.length}, Unique: ${deduped.length}, Duplicates removed: ${totalDupes}`);
console.log(`\n--- Duplicates by person ---`);
console.log(`Afreen: ${dupes.Afreen.length} duplicates (within her own list)`);
console.log(`Jakeer: ${dupes.Jakeer.length} duplicates (overlapping with Afreen or within his list)`);
console.log(`Sami:   ${dupes.Sami.length} duplicates (overlapping with Afreen/Jakeer or within his list)`);

if (dupes.Afreen.length) {
  console.log(`\n  Afreen's duplicates:`);
  dupes.Afreen.forEach(d => console.log(`    ${d.url}  (already by ${d.alreadyAddedBy})`));
}
if (dupes.Jakeer.length) {
  console.log(`\n  Jakeer's duplicates:`);
  dupes.Jakeer.forEach(d => console.log(`    ${d.url}  (already by ${d.alreadyAddedBy})`));
}
if (dupes.Sami.length) {
  console.log(`\n  Sami's duplicates:`);
  dupes.Sami.forEach(d => console.log(`    ${d.url}  (already by ${d.alreadyAddedBy})`));
}

console.log(`\n--- Final count per person ---`);
const countBy = { Afreen: 0, Jakeer: 0, Sami: 0 };
deduped.forEach(v => countBy[v.addedBy]++);
console.log(`Afreen: ${countBy.Afreen}`);
console.log(`Jakeer: ${countBy.Jakeer}`);
console.log(`Sami:   ${countBy.Sami}`);

// Write output
writeFileSync(
  '/home/jakeer/najdi-video-tracker/src/data/seed-data.json',
  JSON.stringify(deduped, null, 2)
);

console.log('Written to src/data/seed-data.json');
