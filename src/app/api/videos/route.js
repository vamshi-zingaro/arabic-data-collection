import { NextResponse } from "next/server";
import { normalizeVideoUrl, createUrlHash, parseDuration } from "@/utils/urlUtils";

const { db } = require("@/lib/firebase-admin");

const COLLECTION = "video_data_links";

// GET /api/videos — list all videos
export async function GET() {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("addedAt", "desc")
      .get();

    const videos = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Backward compat: if durationSeconds missing, parse old duration string
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

    return NextResponse.json({ videos });
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
    const { url, addedBy, notes, source, durationSeconds, dialect } =
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
