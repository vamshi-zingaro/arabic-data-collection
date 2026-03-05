import { NextResponse } from "next/server";

function extractVideoId(url) {
  try {
    const urlObj = new URL(url.trim());
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.slice(1).split("/")[0] || null;
    }
    if (urlObj.hostname.includes("youtube.com")) {
      if (urlObj.pathname === "/watch") return urlObj.searchParams.get("v");
      const shortMatch = urlObj.pathname.match(/^\/(shorts|embed|v)\/([^/]+)/);
      if (shortMatch) return shortMatch[2];
    }
    return null;
  } catch {
    return null;
  }
}

// Primary: YouTube internal player API (works from cloud IPs)
async function fetchViaPlayerApi(videoId) {
  const res = await fetch(
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: "ANDROID",
            clientVersion: "19.09.37",
            androidSdkVersion: 30,
            hl: "en",
            gl: "US",
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const details = data?.videoDetails;
  if (!details) return null;

  const lengthSeconds = parseInt(details.lengthSeconds, 10);
  return {
    duration: lengthSeconds > 0 ? lengthSeconds : null,
    channel: details.author || null,
  };
}

// Fallback: fetch YouTube HTML page with consent cookie
async function fetchViaHtmlScrape(videoId) {
  const res = await fetch(
    `https://www.youtube.com/watch?v=${videoId}`,
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Cookie: "CONSENT=PENDING+999; SOCS=CAESEwgDEgk2MjE5MTUxNTIaAmVuIAEaBgiA_LyaBg",
      },
      signal: AbortSignal.timeout(8000),
    }
  );

  if (!res.ok) return null;
  const html = await res.text();

  const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
  const channelMatch = html.match(/"ownerChannelName":"([^"]+)"/);

  const lengthSeconds = durationMatch ? parseInt(durationMatch[1], 10) : null;
  const channel = channelMatch ? channelMatch[1] : null;

  return {
    duration: lengthSeconds > 0 ? lengthSeconds : null,
    channel,
  };
}

export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ duration: null });
    }

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

    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ duration: null });
    }

    // Try internal player API first, then HTML scrape fallback
    let result = await fetchViaPlayerApi(videoId);
    if (!result?.duration) {
      result = await fetchViaHtmlScrape(videoId);
    }

    return NextResponse.json({
      duration: result?.duration || null,
      channel: result?.channel || null,
    });
  } catch (err) {
    console.error("[videos:duration] Error:", err.message);
    return NextResponse.json({ duration: null });
  }
}
