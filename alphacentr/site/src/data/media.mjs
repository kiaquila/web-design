/* Photography migrated from alphacentr.ru.

   Session covers and article lead images keep their original artwork; the map
   is generated from the source pages, so a session without artwork on the
   original simply has no entry here and the template falls back to type. */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const media = JSON.parse(
  readFileSync(join(import.meta.dirname, "..", "content", "media.json"), "utf8")
);

export const sessionImages = media.sessions;
export const articleImages = media.articles;

export const heroPhoto = "/assets/media/main-photo.webp";

/** Cover for a session, or null when the original had none. */
export function sessionImage(id) {
  return sessionImages[id] ?? null;
}

/** Lead image for an article, or null. */
export function articleImage(path) {
  return articleImages[path] ?? null;
}

/**
 * Pick a representative image for a catalogue category: the first session in
 * it that has artwork.
 */
export function categoryImage(category) {
  for (const session of category.sessions) {
    const image = sessionImage(session.id);
    if (image) return image;
  }
  return null;
}
