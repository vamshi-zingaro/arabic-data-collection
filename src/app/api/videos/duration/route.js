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

    // Fetch YouTube page HTML and extract metadata
    const normalizedUrl = urlObj.hostname.includes("youtu.be")
      ? `https://www.youtube.com/watch?v=${urlObj.pathname.slice(1).split("/")[0]}`
      : url.trim();

    const res = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ duration: null });
    }

    const html = await res.text();

    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);

    const lengthSeconds = durationMatch ? parseInt(durationMatch[1], 10) : null;
    const channel = channelMatch ? channelMatch[1] : null;

    if (!lengthSeconds || lengthSeconds <= 0) {
      return NextResponse.json({ duration: null, channel });
    }

    return NextResponse.json({ duration: lengthSeconds, channel });
  } catch (err) {
    console.error("[videos:duration] Error:", err.message);
    return NextResponse.json({ duration: null });
  }
}
