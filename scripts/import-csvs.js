import { readFileSync } from 'fs';
import admin from 'firebase-admin';

// Reuse URL normalization logic (inline copy from src/utils/urlUtils.js)
function normalizeVideoUrl(url) {
  try {
    const urlObj = new URL(url.trim());
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      return normalizeYouTubeUrl(urlObj);
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

function normalizeYouTubeUrl(urlObj) {
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

function createUrlHash(normalizedUrl) {
  let hash = 0;
  for (let i = 0; i < normalizedUrl.length; i++) {
    const char = normalizedUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function parseDurationToSeconds(str) {
  if (!str || typeof str !== 'string') return 0;
  let clean = str.trim().replace(/\.$/g, '').replace(/\./g, ':');
  if (clean.startsWith(':')) clean = clean.slice(1);
  const parts = clean.split(':').map(Number);
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

// Firebase Admin init
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const COLLECTION = 'video_data_links';

const DRY_RUN = process.argv.includes('--dry-run');

const CSV_FILES = [
  // Already imported:
  // { path: 'csv-data/deduped/afreen-deduped.csv', addedBy: 'Afreen', speakersCol: 3, durationCol: 4 },
  // { path: 'csv-data/deduped/jakeer-deduped.csv', addedBy: 'Jakeer', speakersCol: 3, durationCol: 4 },
  { path: 'csv-data/originals/sami-latest.csv', addedBy: 'Sami', speakersCol: 4, durationCol: 3 },
];

async function importCSVs() {
  if (DRY_RUN) console.log('=== DRY RUN MODE (no writes) ===\n');

  // Parse all videos from CSVs
  const videos = [];
  for (const file of CSV_FILES) {
    const lines = readFileSync(file.path, 'utf8').split('\n');
    let count = 0;
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.replace(/,/g, '').trim() === '') continue;

      const cols = line.split(',');
      const url = (cols[2] || '').trim();
      if (!url || !url.startsWith('http')) continue;

      const normalizedUrl = normalizeVideoUrl(url);
      const urlHash = createUrlHash(normalizedUrl);
      const speakers = parseInt(cols[file.speakersCol], 10) || 1;
      const durationSeconds = parseDurationToSeconds(cols[file.durationCol] || '');

      videos.push({
        url,
        normalizedUrl,
        urlHash,
        addedBy: file.addedBy,
        notes: '',
        source: 'YouTube',
        durationSeconds,
        dialect: 'Najdi',
        speakers,
      });
      count++;
    }
    console.log(`Parsed ${file.path}: ${count} videos (${file.addedBy})`);
  }

  console.log(`\nTotal videos to import: ${videos.length}`);

  // Fetch existing hashes from Firestore
  console.log('Fetching existing data from Firestore...');
  const snapshot = await db.collection(COLLECTION).select('urlHash').get();
  const existingHashes = new Set();
  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.urlHash) existingHashes.add(d.urlHash);
  });
  console.log(`Existing documents in Firestore: ${snapshot.size}\n`);

  // Import
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];

    if (existingHashes.has(video.urlHash)) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      added++;
      if (added <= 5) {
        console.log(`  [DRY] Would add: ${video.url} (${video.addedBy}, ${video.durationSeconds}s, ${video.speakers} spk)`);
      }
      existingHashes.add(video.urlHash);
      continue;
    }

    try {
      await db.collection(COLLECTION).add({
        ...video,
        addedAt: admin.firestore.Timestamp.now(),
      });
      added++;
      existingHashes.add(video.urlHash);

      if (added % 50 === 0) {
        console.log(`  Progress: ${added} added, ${skipped} skipped, ${i + 1}/${videos.length} processed`);
      }
    } catch (err) {
      failed++;
      console.error(`  Failed: ${video.url} — ${err.message}`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Added:   ${added}`);
  console.log(`  Skipped: ${skipped} (already in Firestore)`);
  console.log(`  Failed:  ${failed}`);

  process.exit(0);
}

importCSVs().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
