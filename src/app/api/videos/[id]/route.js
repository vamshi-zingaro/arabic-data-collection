import { NextResponse } from "next/server";

import { db } from "@/lib/firebase-admin";

const COLLECTION = "video_data_links";

// DELETE /api/videos/[id] — delete a video
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    await db.collection(COLLECTION).doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[videos:delete] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete video" },
      { status: 500 }
    );
  }
}
