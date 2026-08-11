import { createHash } from "node:crypto";

import { generateField } from "../src/js/field.js";

export const SOCIAL_WIDTH = 1200;
export const SOCIAL_HEIGHT = 630;
export const FIELD_FINGERPRINT_KEY = "alex-neon-field-sha256";

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

/** Hash only the small generated graph, not the expensive raster framebuffer. */
export function fingerprintField(field) {
  const hash = createHash("sha256");
  hash.update(`alex-neon-field-v1:${field.count}:${field.edgeCount}:${field.cx}:${field.rx}\0`);
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
