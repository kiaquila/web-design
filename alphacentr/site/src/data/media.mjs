/* Photography stays disabled until the client confirms usage rights. The
   templates deliberately retain their media frames so approved replacements
   can be added later without changing page structure. */

export const heroPhoto = null;

/** Cover for a session, or null when the original had none. */
export function sessionImage(id) {
  return null;
}

/** Lead image for an article, or null. */
export function articleImage(path) {
  return null;
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
