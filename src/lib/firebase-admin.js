const admin = require("firebase-admin");
const { readFileSync } = require("fs");
const { join } = require("path");

if (!admin.apps.length) {
  const creds = JSON.parse(
    readFileSync(join(process.cwd(), "firebase_creds.json"), "utf8")
  );
  admin.initializeApp({
    credential: admin.credential.cert(creds),
  });
}

const db = admin.firestore();
module.exports = { db };
