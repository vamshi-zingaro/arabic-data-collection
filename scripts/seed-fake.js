import admin from 'firebase-admin';

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
const CONTRIBUTORS = ['Jakeer', 'Sami', 'Afreen'];
const SOURCES = ['YouTube', 'TikTok', 'Instagram', 'Facebook', 'Vimeo', 'X/Twitter'];

const SOURCE_URLS = {
  YouTube: (i) => `https://www.youtube.com/watch?v=fake${String(i).padStart(4, '0')}`,
  TikTok: (i) => `https://www.tiktok.com/@user/video/${7000000000 + i}`,
  Instagram: (i) => `https://www.instagram.com/reel/fake${String(i).padStart(4, '0')}`,
  Facebook: (i) => `https://www.facebook.com/watch/?v=${9000000000 + i}`,
  Vimeo: (i) => `https://vimeo.com/${800000000 + i}`,
  'X/Twitter': (i) => `https://x.com/user/status/${1700000000000 + i}`,
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('Seeding 60 fake videos...\n');

  let added = 0;

  for (let i = 1; i <= 60; i++) {
    const source = SOURCES[randomInt(0, SOURCES.length - 1)];
    const addedBy = CONTRIBUTORS[randomInt(0, CONTRIBUTORS.length - 1)];
    const durationSeconds = randomInt(30, 7200);
    const url = SOURCE_URLS[source](i);
    const normalizedUrl = url.toLowerCase();
    const urlHash = `fake_${i}`;

    const daysAgo = randomInt(0, 30);
    const addedAt = new Date();
    addedAt.setDate(addedAt.getDate() - daysAgo);
    addedAt.setHours(randomInt(8, 22), randomInt(0, 59), randomInt(0, 59));

    try {
      await db.collection(COLLECTION).add({
        url,
        normalizedUrl,
        urlHash,
        addedBy,
        notes: '',
        source,
        durationSeconds,
        dialect: 'Najdi',
        addedAt: admin.firestore.Timestamp.fromDate(addedAt),
      });
      added++;
      if (added % 10 === 0) {
        console.log(`  ${added}/60 added...`);
      }
    } catch (err) {
      console.error(`  Failed #${i}: ${err.message}`);
    }
  }

  console.log(`\nDone! Added ${added} fake videos.`);
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
