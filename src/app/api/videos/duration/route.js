import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ duration: null });
    }

    // Only attempt for YouTube URLs
    let urlObj;
    try {
      urlObj = new URL(url.trim());
    } catch {
      return NextResponse.json({ duration: null });
    }

    const isYouTube =
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtu.be");

    if (!isYouTube) {
      return NextResponse.json({ duration: null });
    }

    const ytdl = (await import("@distube/ytdl-core")).default;
    const info = await ytdl.getBasicInfo(url.trim());

    const lengthSeconds = parseInt(info.videoDetails?.lengthSeconds, 10);

    if (!lengthSeconds || isNaN(lengthSeconds) || lengthSeconds <= 0) {
      return NextResponse.json({ duration: null });
    }

    const channel = info.videoDetails?.author?.name || null;

    return NextResponse.json({ duration: lengthSeconds, channel });
  } catch (err) {
    console.error("[videos:duration] Error:", err.message);
    return NextResponse.json({ duration: null });
  }
}
