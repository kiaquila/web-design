#!/usr/bin/env node
/* Local preview for dist/. Node builtins only. */

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const dist = resolve(import.meta.dirname, "..", "dist");
const port = Number(process.env.PORT ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml"
};

async function resolveFile(pathname) {
  const relative = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(dist, relative);
  if (!file.startsWith(dist)) return null;
  try {
    const info = await stat(file);
    if (info.isDirectory()) file = join(file, "index.html");
    await stat(file);
    return file;
  } catch {
    return null;
  }
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = await resolveFile(url.pathname);
  if (!file) {
    const fallback = join(dist, "404.html");
    response.writeHead(404, { "content-type": TYPES[".html"] });
    createReadStream(fallback).pipe(response);
    return;
  }
  response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, () => {
  console.log(`  preview on http://localhost:${port}`);
});
