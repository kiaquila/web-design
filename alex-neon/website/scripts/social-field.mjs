import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { generateField } from "../src/js/field.js";

export const SOCIAL_WIDTH = 1200;
export const SOCIAL_HEIGHT = 630;
export const CARD_FINGERPRINT_KEY = "alex-neon-card-sha256";

/** The exact geometry shared by the checked-in card and its drift test. */
export function createSocialField() {
  return generateField({
    cx: SOCIAL_WIDTH * 0.5,
    cy: SOCIAL_HEIGHT * 0.5,
    rx: SOCIAL_WIDTH * 0.42,
    ry: SOCIAL_HEIGHT * 0.44,
    nodes: 900,
    seed: 0x5eed
  });
}

/**
 * Hash every repository-controlled render input plus the small generated graph.
 * This catches palette and renderer drift without rebuilding the framebuffer.
 */
export function fingerprintSocialCard(field) {
  const hash = createHash("sha256");
  hash.update("alex-neon-card-v1\0");
  for (const source of [
    new URL("../src/js/field.js", import.meta.url),
    new URL("./social-field.mjs", import.meta.url),
    new URL("./make-og.mjs", import.meta.url)
  ]) {
    hash.update(readFileSync(source));
    hash.update("\0");
  }
  hash.update(`${field.count}:${field.edgeCount}:${field.cx}:${field.rx}\0`);
  for (const values of [field.x, field.y, field.r, field.ea, field.eb, field.elong]) {
    hash.update(Buffer.from(values.buffer, values.byteOffset, values.byteLength));
  }
  return hash.digest("hex");
}

/** Reads one uncompressed PNG tEXt value without decoding the image pixels. */
export function readPngText(buffer, key) {
  let offset = 8; // PNG signature
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) return null;
    if (type === "tEXt") {
      const separator = buffer.indexOf(0, dataStart);
      if (separator >= dataStart && separator < dataEnd) {
        const name = buffer.toString("latin1", dataStart, separator);
        if (name === key) return buffer.toString("latin1", separator + 1, dataEnd);
      }
    }
    offset = dataEnd + 4; // CRC
  }
  return null;
}
