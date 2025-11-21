export default {
  async fetch(request) {
    const url = new URL(request.url);
    const inputUrl = url.searchParams.get('url');

    if (!inputUrl || (!inputUrl.includes("youtube.com") && !inputUrl.includes("youtu.be"))) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Invalid YouTube URL"
      }), { status: 400 });
    }

    // YouTube video ID extract
    const vid = inputUrl.match(/(v=|youtu.be\/)([a-zA-Z0-9_-]+)/);
    if (!vid) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Could not detect video ID"
      }), { status: 400 });
    }

    const videoId = vid[2];

    // Active download servers
    const apis = [
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://inv.zzls.xyz/api/v1/videos/${videoId}`
    ];

    let final = null;

    for (const api of apis) {
      try {
        const response = await fetch(api, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });

        if (!response.ok) continue;

        const data = await response.json();

        // Piped format
        if (data.videoStreams) {
          const best = data.videoStreams
            .filter(v => v.videoOnly === false)
            .sort((a, b) => b.quality - a.quality)[0];

          final = {
            title: data.title,
            thumbnail: data.thumbnailUrl,
            channel: data.uploader,
            quality: best.quality,
            video: best.url
          };
          break;
        }

        // Invidious format
        if (data.formatStreams) {
          const best = data.formatStreams.sort((a, b) => b.size - a.size)[0];

          final = {
            title: data.title,
            thumbnail: data.videoThumbnails?.[0]?.url,
            channel: data.author,
            quality: best.qualityLabel || best.type,
            video: best.url
          };
          break;
        }

      } catch (err) {
        continue;
      }
    }

    if (!final) {
      return new Response(JSON.stringify({
        status: "error",
        message: "All servers failed"
      }), { status: 500 });
    }

    return new Response(JSON.stringify({
      status: "success",
      ...final
    }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};