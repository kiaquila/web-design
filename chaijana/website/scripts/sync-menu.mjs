import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const menuRoot = join(websiteRoot, "..", "menu");
const destination = join(websiteRoot, "public", "menu");
const fontDestination = join(websiteRoot, "public", "fonts");

await rm(destination, { force: true, recursive: true });
await mkdir(destination, { recursive: true });

for (const file of ["index.html", "en.html", "ru.html"]) {
  await cp(join(menuRoot, file), join(destination, file));
}

// Copy the whole asset tree rather than a hand-written manifest: every time an
// asset was added to the menu (fonts, the vector wordmark, the partner logo) a
// per-file list silently shipped a 404 while every build stayed green.
await cp(join(menuRoot, "assets"), join(destination, "assets"), { recursive: true });

// The site loads the same display face as the menu. Serve one copy, generated
// here, instead of committing the eight WOFF2 binaries a second time — two
// tracked copies drift and double the cache keys in production.
// Clear the generated directory so retired font files cannot survive an
// incremental build after the source inventory changes.
await rm(fontDestination, { force: true, recursive: true });
await cp(join(menuRoot, "assets", "fonts"), fontDestination, {
  force: true,
  recursive: true,
});

const dishCount = (await readdir(join(destination, "assets", "dishes"))).filter((name) =>
  name.endsWith(".webp"),
).length;

console.log(`Synced the menu asset tree (${dishCount} dish images) and the shared fonts.`);
