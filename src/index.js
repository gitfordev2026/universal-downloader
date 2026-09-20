export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/download") {
      return env.ASSETS.fetch(request);
    }

    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing url parameter", {
        status: 400
      });
    }

    let parsed;

    try {
      parsed = new URL(target);

      if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
      ) {
        throw new Error();
      }
    } catch {
      return new Response("Invalid URL", {
        status: 400
      });
    }

    const forwardHeaders = new Headers();

    const range = request.headers.get("Range");
    if (range) {
      forwardHeaders.set("Range", range);
    }

    const userAgent = request.headers.get("User-Agent");
    if (userAgent) {
      forwardHeaders.set("User-Agent", userAgent);
    }

    const upstream = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: forwardHeaders
    });

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: upstream.headers
    });
  }
};