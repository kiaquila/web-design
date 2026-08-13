#!/usr/bin/env node
/* Minimal static file server for previewing dist/ locally. */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.PORT ?? 4620);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  const candidates = clean.endsWith("/")
    ? [join(dist, clean, "index.html")]
    : [join(dist, clean), join(dist, clean, "index.html")];

  for (const candidate of candidates) {
    if (!candidate.startsWith(dist)) continue;
    try {
      const info = await stat(candidate);
      if (info.isFile()) return candidate;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

async function nearestNotFound(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split("?")[0])).replace(
    /^(\.\.[/\\])+/,
    ""
  );
  const segments = clean.split("/").filter(Boolean).slice(0, -1);
  while (true) {
    const candidate = join(dist, ...segments, "404.html");
    if (candidate.startsWith(dist)) {
      try {
        if ((await stat(candidate)).isFile()) return candidate;
      } catch {
        /* keep walking up */
      }
    }
    if (segments.length === 0) return null;
    segments.pop();
  }
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? "/");
  if (!file) {
    /* Walks up from the requested path to the nearest 404.html, the way
       Workers Static Assets does — otherwise a missing /en/ URL would answer
       in Russian here and in English in production. */
    const notFound = await nearestNotFound(request.url ?? "/");
    response.writeHead(404, { "content-type": TYPES[".html"] });
    if (notFound) {
      createReadStream(notFound).pipe(response);
    } else {
      response.end("<h1>404</h1>");
    }
    return;
  }
  response.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-cache"
  });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`KS portfolio preview: http://localhost:${port}`);
});
