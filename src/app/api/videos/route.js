import { NextResponse } from "next/server";
import { normalizeVideoUrl, createUrlHash, parseDuration } from "@/utils/urlUtils";

import { db } from "@/lib/firebase-admin";

const COLLECTION = "video_data_links";

// GET /api/videos — list videos with cursor-based pagination
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit"), 10) || 50, 200);
    const cursor = searchParams.get("cursor");

    let query = db
      .collection(COLLECTION)
      .orderBy("addedAt", "desc")
      .limit(limit + 1); // fetch one extra to check if there are more

    if (cursor) {
      const cursorDoc = await db.collection(COLLECTION).doc(cursor).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;
    const hasMore = docs.length > limit;
    const pageDocs = hasMore ? docs.slice(0, limit) : docs;

    const videos = pageDocs.map((doc) => {
      const data = doc.data();
      const durationSeconds =
        data.durationSeconds != null
          ? data.durationSeconds
          : parseDuration(data.duration || "");
      return {
        id: doc.id,
        ...data,
        durationSeconds,
        addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
      };
    });

    const nextCursor = hasMore ? pageDocs[pageDocs.length - 1].id : null;

    // On first page load, return total count and total duration
    let totalCount = null;
    let totalDurationSeconds = null;
    if (!cursor) {
      const countSnapshot = await db.collection(COLLECTION).count().get();
      totalCount = countSnapshot.data().count;

      const allDocs = await db.collection(COLLECTION).select("durationSeconds", "duration").get();
      totalDurationSeconds = 0;
      allDocs.forEach((doc) => {
        const d = doc.data();
        totalDurationSeconds += d.durationSeconds != null ? d.durationSeconds : parseDuration(d.duration || "");
      });
    }

    return NextResponse.json({ videos, nextCursor, hasMore, totalCount, totalDurationSeconds });
  } catch (err) {
    console.error("[videos:list] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to list videos" },
      { status: 500 }
    );
  }
}

// POST /api/videos — add a new video
export async function POST(request) {
  try {
    const { url, addedBy, notes, source, durationSeconds, dialect, speakers } =
      await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const normalizedUrl = normalizeVideoUrl(url);
    const urlHash = createUrlHash(normalizedUrl);

    // Check for duplicate
    const existing = await db
      .collection(COLLECTION)
      .where("urlHash", "==", urlHash)
      .get();

    if (!existing.empty) {
      const doc = existing.docs[0];
      const data = doc.data();
      return NextResponse.json(
        {
          success: false,
          isDuplicate: true,
          existingVideo: {
            id: doc.id,
            ...data,
            addedAt: data.addedAt?.toDate?.()?.toISOString() || null,
          },
        },
        { status: 409 }
      );
    }

    const videoData = {
      url: url.trim(),
      normalizedUrl,
      urlHash,
      addedBy: (addedBy || "").trim() || "Anonymous",
      notes: (notes || "").trim(),
      source: source || "",
      durationSeconds: parseInt(durationSeconds, 10) || 0,
      dialect: dialect || "Najdi",
      speakers: parseInt(speakers, 10) || 1,
      addedAt: new Date(),
    };

    const docRef = await db.collection(COLLECTION).add(videoData);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      video: { id: docRef.id, ...videoData, addedAt: videoData.addedAt.toISOString() },
    });
  } catch (err) {
    console.error("[videos:add] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add video" },
      { status: 500 }
    );
  }
}
