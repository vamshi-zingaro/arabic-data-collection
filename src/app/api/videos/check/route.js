import { NextResponse } from "next/server";
import { normalizeVideoUrl, createUrlHash } from "@/utils/urlUtils";

import { db } from "@/lib/firebase-admin";

const COLLECTION = "video_data_links";

// POST /api/videos/check — check if URL already exists
export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = normalizeVideoUrl(url);
    const urlHash = createUrlHash(normalizedUrl);

    const snapshot = await db
      .collection(COLLECTION)
      .where("urlHash", "==", urlHash)
      .get();

    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return NextResponse.json({
        isDuplicate: true,
        existingVideo: {
          id: doc.id,
          ...data,
          addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
        },
      });
    }

    return NextResponse.json({ isDuplicate: false, existingVideo: null });
  } catch (err) {
    console.error("[videos:check] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check URL" },
      { status: 500 }
    );
  }
}
