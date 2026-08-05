import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const menuRoot = join(websiteRoot, "..", "menu");
const destination = join(websiteRoot, "public", "menu");

await rm(destination, { force: true, recursive: true });
await mkdir(join(destination, "assets", "dishes"), { recursive: true });

for (const file of ["index.html", "en.html", "ru.html"]) {
  await cp(join(menuRoot, file), join(destination, file));
}

for (const file of ["chaijana-logo.png", "chaijana-wordmark.svg", "bonpunto-logo.svg", "menu.css"]) {
  await cp(join(menuRoot, "assets", file), join(destination, "assets", file));
}

await cp(join(menuRoot, "assets", "fonts"), join(destination, "assets", "fonts"), {
  recursive: true,
});

const dishFiles = await readdir(join(menuRoot, "assets", "dishes"));
for (const file of dishFiles.filter((name) => name.endsWith(".webp"))) {
  await cp(
    join(menuRoot, "assets", "dishes", file),
    join(destination, "assets", "dishes", file),
  );
}

console.log(`Synced ${dishFiles.filter((name) => name.endsWith(".webp")).length} menu images.`);
