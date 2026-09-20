# Universal Downloader

A lightweight Cloudflare Worker that proxies direct file downloads through Cloudflare while preserving native download behavior.

Unlike many download proxies, this project does **not** buffer files, save files, or rewrite download streams. It simply forwards the download request and streams the response back to the user.

## Features

* Direct download proxy
* Streams files through Cloudflare
* Supports resumable downloads
* Supports download managers
* Preserves Range requests
* Preserves Content-Length
* Preserves Content-Range
* Preserves Accept-Ranges
* Preserves ETag headers
* Supports GitHub release downloads
* Supports large files
* No database required
* No authentication required
* Static frontend included
* Auto deployment with GitHub + Cloudflare Workers

---

# How It Works

```text
Browser
   ↓
Cloudflare Worker
   ↓
Origin Server
   ↓
Cloudflare Worker
   ↓
Browser
```

The Worker acts as a transparent proxy.

It does not:

* Save files
* Cache files
* Modify file contents
* Store download history

It simply forwards requests and streams the response.

---

# Project Structure

```text
downloader-worker/
│
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── src/
│   └── index.js
│
├── package.json
└── wrangler.jsonc
```

---

# Requirements

* Cloudflare account
* GitHub account
* Node.js 20+

---

# Local Setup

Clone repository:

```bash
git clone https://github.com/YOUR_USERNAME/universal-downloader.git

cd universal-downloader
```

Install dependencies:

```bash
npm install
```

Login to Cloudflare:

```bash
npx wrangler login
```

Run locally:

```bash
npm run dev
```

Open:

```text
http://localhost:8787
```

---

# Cloudflare Worker Configuration

Example `wrangler.jsonc`:

```json
{
  "$schema": "node_modules/wrangler/config-schema.json",

  "name": "universal-downloader",

  "main": "src/index.js",

  "compatibility_date": "2026-09-16",

  "assets": {
    "directory": "./public"
  },

  "observability": {
    "enabled": true
  }
}
```

---

# Worker Code

Example Worker:

```javascript
export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (url.pathname !== "/download") {
      return env.ASSETS.fetch(request);
    }

    const target = url.searchParams.get("url");

    if (!target) {
      return new Response(
        "Missing url parameter",
        { status: 400 }
      );
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

      return new Response(
        "Invalid URL",
        { status: 400 }
      );
    }

    const headers = new Headers();

    const range =
      request.headers.get("Range");

    if (range) {
      headers.set("Range", range);
    }

    const upstream =
      await fetch(target, {
        redirect: "follow",
        headers
      });

    return new Response(
      upstream.body,
      {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: upstream.headers
      }
    );
  }
};
```

---

# Frontend

The frontend is intentionally simple.

Users paste a URL and click Download.

Example:

```javascript
document
.getElementById("downloadBtn")
.addEventListener("click", () => {

  const url =
    document
      .getElementById("url")
      .value
      .trim();

  if (!url) {
    alert("Enter URL");
    return;
  }

  window.location.href =
    "/download?url=" +
    encodeURIComponent(url);
});
```

---

# Deploy Using Wrangler

Deploy manually:

```bash
npm run deploy
```

or

```bash
npx wrangler deploy
```

Cloudflare will return:

```text
https://your-worker.workers.dev
```

---

# Deploy Using GitHub

Push project:

```bash
git init

git add .

git commit -m "Initial commit"

git branch -M main

git remote add origin https://github.com/YOUR_USERNAME/universal-downloader.git

git push -u origin main
```

---

# Connect Repository to Cloudflare

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Create Worker.
4. Choose Import from GitHub.
5. Select repository.
6. Select branch:

```text
main
```

7. Save.

Cloudflare will automatically deploy every push.

---

# Updating The Project

After making changes:

```bash
git add .

git commit -m "Update"

git push
```

Cloudflare automatically redeploys.

---

# Resume Download Support

Resume support works because the Worker forwards the original Range header:

```http
Range: bytes=1000000-
```

and preserves upstream response headers:

```http
Accept-Ranges
Content-Length
Content-Range
ETag
Last-Modified
```

This allows:

* Browser resume
* Download manager resume
* Multi-thread downloads

---

# Supported Sources

Examples:

* GitHub Releases
* GitHub Archives
* ZIP files
* EXE files
* PDFs
* Images
* ISO files
* Public HTTP downloads
* Public HTTPS downloads

---

# Limitations

This project cannot download:

* Files requiring login
* Private cloud storage links
* Sites protected by cookies
* Sites blocking Cloudflare IPs
* DRM protected content

---

# Security Notes

The Worker only allows:

```text
http://
https://
```

URLs.

Other protocols should be rejected.

Examples:

```text
file://
ftp://
data:
javascript:
```

---

# License

MIT License

Use, modify, and distribute freely.
