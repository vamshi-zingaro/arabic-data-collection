import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCZAUVMSfr0Yvjp--Q-UYxf3mawDHBogYM",
  authDomain: "dinobot-litecompute.firebaseapp.com",
  projectId: "dinobot-litecompute",
  storageBucket: "dinobot-litecompute.firebasestorage.app",
  messagingSenderId: "51740338871",
  appId: "1:51740338871:web:4b122c9bfe8729470f7b32",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTION = 'video_data_links';

async function seed() {
  const data = JSON.parse(readFileSync('src/data/seed-data.json', 'utf-8'));
  console.log(`Loaded ${data.length} videos from seed-data.json`);

  // Check how many already exist in Firestore
  const existing = await getDocs(collection(db, COLLECTION));
  console.log(`Existing documents in Firestore: ${existing.size}`);

  if (existing.size > 0) {
    console.log('\n⚠️  Collection already has data.');
    console.log('To avoid duplicates, this script checks each URL before inserting.');
    console.log('This may take a few minutes...\n');
  }

  // Build a set of existing urlHashes for fast lookup
  const existingHashes = new Set();
  existing.forEach(doc => {
    const d = doc.data();
    if (d.urlHash) existingHashes.add(d.urlHash);
  });

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < data.length; i++) {
    const video = data[i];

    // Skip if already in Firestore
    if (existingHashes.has(video.urlHash)) {
      skipped++;
      continue;
    }

    try {
      await addDoc(collection(db, COLLECTION), {
        url: video.url,
        normalizedUrl: video.normalizedUrl,
        urlHash: video.urlHash,
        addedBy: video.addedBy,
        notes: video.notes || '',
        source: video.source,
        duration: video.duration || '',
        dialect: video.dialect,
        speakers: video.speakers || '',
        addedAt: Timestamp.now(),
      });
      added++;

      // Progress log every 50
      if (added % 50 === 0) {
        console.log(`  Progress: ${added} added, ${skipped} skipped, ${i + 1}/${data.length} processed`);
      }
    } catch (err) {
      failed++;
      console.error(`  Failed to add ${video.url}: ${err.message}`);
    }
  }

  console.log(`\nDone!`);
  console.log(`  Added:   ${added}`);
  console.log(`  Skipped: ${skipped} (already in DB)`);
  console.log(`  Failed:  ${failed}`);

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
