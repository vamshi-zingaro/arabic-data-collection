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
const snap = await db.collection('video_data_links').select('addedBy').get();
const names = {};
snap.forEach(doc => {
  const name = doc.data().addedBy || '(empty)';
  names[name] = (names[name] || 0) + 1;
});

console.log('Videos by addedBy:');
for (const [name, count] of Object.entries(names).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${name}: ${count}`);
}
console.log('Total:', snap.size);

process.exit(0);
