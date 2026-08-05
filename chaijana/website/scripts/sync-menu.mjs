import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const menuRoot = join(websiteRoot, "..", "menu");
const destination = join(websiteRoot, "public", "menu");

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
// here, instead of committing the five woff2 binaries a second time — two
// tracked copies drift and double the cache keys in production.
await cp(join(menuRoot, "assets", "fonts"), join(websiteRoot, "public", "fonts"), {
  force: true,
  recursive: true,
});

const dishCount = (await readdir(join(destination, "assets", "dishes"))).filter((name) =>
  name.endsWith(".webp"),
).length;

console.log(`Synced the menu asset tree (${dishCount} dish images) and the shared fonts.`);
