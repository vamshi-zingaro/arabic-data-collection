import { NextResponse } from "next/server";
import { parseDuration } from "@/utils/urlUtils";
import { db } from "@/lib/firebase-admin";

const COLLECTION = "video_data_links";

// GET /api/videos/stats — per-contributor aggregated stats
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateFilter = searchParams.get("dateFilter") || "all";
    const customDate = searchParams.get("customDate") || "";

    let query = db.collection(COLLECTION);

    // Apply date filter
    const now = new Date();
    let cutoff = null;

    if (dateFilter === "today") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (dateFilter === "week") {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      cutoff = new Date(startOfDay);
      cutoff.setDate(startOfDay.getDate() - startOfDay.getDay());
    } else if (dateFilter === "month") {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (dateFilter === "custom" && customDate) {
      // customDate is YYYY-MM-DD
      cutoff = new Date(customDate + "T00:00:00");
    }

    if (cutoff && dateFilter !== "custom") {
      query = query.where("addedAt", ">=", cutoff);
    }

    // For custom date, filter to a single day
    if (dateFilter === "custom" && cutoff) {
      const endOfDay = new Date(cutoff);
      endOfDay.setDate(endOfDay.getDate() + 1);
      query = query.where("addedAt", ">=", cutoff).where("addedAt", "<", endOfDay);
    }

    const snapshot = await query.select("addedBy", "durationSeconds", "duration").get();

    const stats = {};
    snapshot.forEach((doc) => {
      const d = doc.data();
      const addedBy = d.addedBy || "Anonymous";
      const seconds = d.durationSeconds != null ? d.durationSeconds : parseDuration(d.duration || "");

      if (!stats[addedBy]) {
        stats[addedBy] = { count: 0, totalSeconds: 0 };
      }
      stats[addedBy].count += 1;
      stats[addedBy].totalSeconds += seconds;
    });

    return NextResponse.json({ stats });
  } catch (err) {
    console.error("[videos:stats] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get stats" },
      { status: 500 }
    );
  }
}
