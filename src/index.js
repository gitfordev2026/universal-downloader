export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/download") {
      return downloadHandler(request, env);
    }

    if (url.pathname === "/history") {
      return historyHandler(request, env);
    }

    return env.ASSETS.fetch(request);
  }
};

async function downloadHandler(request, env) {

  const reqUrl = new URL(request.url);
  const target = reqUrl.searchParams.get("url");

  if (!target) {
    return new Response("Missing URL", { status: 400 });
  }

  let parsed;

  try {
    parsed = new URL(target);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error();
    }

  } catch {
    return new Response("Invalid URL", { status: 400 });
  }

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 60000);

  try {

    // const upstream = await fetch(target, {
    //   redirect: "follow",
    //   signal: controller.signal,
    //   headers: {
    //     "User-Agent": "UniversalDownloader/1.0"
    //   }
    // });

    const upstream = await fetch(target, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*"
    }
  });

    clearTimeout(timeout);

    if (!upstream.ok) {
      return new Response(
        `Upstream returned ${upstream.status}`,
        { status: 502 }
      );
    }

    const filename = detectFilename(
      upstream,
      target
    );

    const contentType =
      upstream.headers.get("content-type")
      || "application/octet-stream";

    const contentLength =
      parseInt(
        upstream.headers.get("content-length") || "0",
        10
      );
      if(env.DB) {
        try {
        await env.DB.prepare(`
          INSERT INTO downloads
          (
            filename,
            source_url,
            content_type,
            size,
            downloaded_at
          )
          VALUES (?, ?, ?, ?, ?)
        `)
          .bind(
            filename,
            target,
            contentType,
            contentLength,
            new Date().toISOString()
          )
          .run();
      } catch (e) {
    console.log("History logging failed", e);
  }};

    const headers = new Headers();

    headers.set(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    headers.set(
      "Content-Type",
      contentType
    );

    headers.set(
      "Cache-Control",
      "no-store"
    );

    return new Response(
      upstream.body,
      {
        status: 200,
        headers
      }
    );

  } 
  catch (err) {
  return new Response(
    JSON.stringify({
      error: err.message,
      stack: err.stack
    }),
    {
      status: 500,
      headers: {
        "content-type": "application/json"
      }
    }
  );
}
}

async function historyHandler(request, env) {

  const url = new URL(request.url);

  const token =
    url.searchParams.get("token");

  if (token !== env.ADMIN_TOKEN) {
    return new Response(
      "Forbidden",
      { status: 403 }
    );
  }

  const rows =
    await env.DB.prepare(`
      SELECT *
      FROM downloads
      ORDER BY id DESC
      LIMIT 1000
    `).all();

  return Response.json(rows.results);
}

function detectFilename(response, originalUrl) {

  const cd =
    response.headers.get(
      "content-disposition"
    );

  if (cd) {

    const utf =
      cd.match(
        /filename\*=UTF-8''([^;]+)/i
      );

    if (utf) {
      try {
        return sanitize(
          decodeURIComponent(
            utf[1]
          )
        );
      } catch {}
    }

    const normal =
      cd.match(
        /filename="?([^"]+)"?/i
      );

    if (normal) {
      return sanitize(
        normal[1]
      );
    }
  }

  try {

    const finalUrl =
      new URL(response.url);

    const finalName =
      finalUrl.pathname
        .split("/")
        .pop();

    if (
      finalName &&
      finalName.includes(".")
    ) {
      return sanitize(finalName);
    }

  } catch {}

  try {

    const original =
      new URL(originalUrl);

    const name =
      original.pathname
        .split("/")
        .pop();

    if (
      name &&
      name.includes(".")
    ) {
      return sanitize(name);
    }

  } catch {}

  const ct =
    response.headers.get(
      "content-type"
    ) || "";

  const extMap = {
    "application/pdf": "pdf",
    "application/zip": "zip",
    "application/json": "json",
    "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
    "image/png": "png",
    "image/jpeg": "jpg",
    "text/plain": "txt"
  };

  if (extMap[ct]) {
    return `download.${extMap[ct]}`;
  }

  return "download.bin";
}

function sanitize(name) {
  return name.replace(
    /[<>:"/\\|?*]/g,
    "_"
  );
}