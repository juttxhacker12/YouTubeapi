export default {
  async fetch(request) {
    const url = new URL(request.url);
    const inputUrl = url.searchParams.get('url');

    // Validate URL
    if (!inputUrl || !inputUrl.includes("youtube.com") && !inputUrl.includes("youtu.be")) {
      return new Response(JSON.stringify({
        status: "error",
        message: "Invalid or missing YouTube URL"
      }, null, 2), { status: 400 });
    }

    // 3rd-party YouTube downloader APIs
    const apis = [
      {
        name: "yt5s",
        url: `https://yt5s.com/api/ajaxSearch/index`,
        method: "POST",
        body: `q=${encodeURIComponent(inputUrl)}&vt=home`,
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8"
        }
      },
      {
        name: "savefrom",
        url: `https://worker.savefrom.net/savefrom.php?url=${encodeURIComponent(inputUrl)}&v=1`,
        method: "GET",
        headers: {
          "user-agent": "Mozilla/5.0"
        }
      },
      {
        name: "ytdlme",
        url: `https://api.ytdlapi.me/info?url=${encodeURIComponent(inputUrl)}`,
        method: "GET",
      }
    ];

    let finalData = null;

    // Try APIs one by one
    for (const api of apis) {
      try {
        const options = {
          method: api.method,
          headers: api.headers || {}
        };

        if (api.method === "POST" && api.body) {
          options.body = api.body;
        }

        const response = await fetch(api.url, options);

        if (!response.ok) continue;

        let data = await response.json();

        // yt5s.com format
        if (api.name === "yt5s" && data.links?.mp4) {
          const vid = Object.values(data.links.mp4).pop();

          finalData = {
            title: data.title,
            thumbnail: data.thumbnail,
            quality: vid.q,
            video: vid.dlink,
            channel: data.author
          };

          break;
        }

        // savefrom.net format
        if (api.name === "savefrom" && data.url?.length > 0) {
          let best = data.url[0];

          finalData = {
            title: data.meta?.title,
            thumbnail: data.meta?.img,
            video: best.url,
            quality: best.quality,
            channel: data.meta?.source
          };

          break;
        }

        // ytdl.me format
        if (api.name === "ytdlme" && data.formats?.length > 0) {
          const hd = data.formats.find(x => x.quality.includes("720")) || data.formats[0];

          finalData = {
            title: data.title,
            thumbnail: data.thumbnail,
            video: hd.url,
            quality: hd.quality,
            channel: data.author
          };

          break;
        }

      } catch (err) {
        // Try next API
        continue;
      }
    }

    if (finalData) {
      return new Response(JSON.stringify({
        status: "success",
        ...finalData,
        dev: "@MadadAliJuTt"
      }, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    return new Response(JSON.stringify({
      status: "error",
      message: "All downloader APIs failed",
      dev: "@MadadAliJuTt"
    }, null, 2), { status: 500 });
  }
};