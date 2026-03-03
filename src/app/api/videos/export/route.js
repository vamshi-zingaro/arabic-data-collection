import { NextResponse } from "next/server";
import { parseDuration, formatDuration } from "@/utils/urlUtils";
import { db } from "@/lib/firebase-admin";

const COLLECTION = "video_data_links";

// GET /api/videos/export — return ALL videos for CSV export
export async function GET() {
  try {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("addedAt", "desc")
      .get();

    const videos = snapshot.docs.map((doc) => {
      const data = doc.data();
      const durationSeconds =
        data.durationSeconds != null
          ? data.durationSeconds
          : parseDuration(data.duration || "");
      return {
        url: data.url || "",
        source: data.source || "",
        addedBy: data.addedBy || "",
        duration: durationSeconds > 0 ? formatDuration(durationSeconds) : (data.duration || ""),
        dialect: data.dialect || "",
        addedAt: data.addedAt?.toDate?.()?.toISOString() || "",
      };
    });

    return NextResponse.json({ videos });
  } catch (err) {
    console.error("[videos:export] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to export videos" },
      { status: 500 }
    );
  }
}
