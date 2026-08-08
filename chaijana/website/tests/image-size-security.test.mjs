import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

const root = new URL("../", import.meta.url);

function box(type, payload = Buffer.alloc(0), declaredSize = 8 + payload.length) {
  const result = Buffer.alloc(8 + payload.length);
  result.writeUInt32BE(declaredSize, 0);
  result.write(type, 4, 4, "ascii");
  payload.copy(result, 8);
  return result;
}

const malformedImages = {
  heif: {
    expected: "Invalid HEIF ispe box size",
    payload: Buffer.concat([
      box("ftyp", Buffer.from("avif\0\0\0\0", "binary")),
      box(
        "meta",
        Buffer.concat([
          Buffer.alloc(4),
          box("iprp", box("ipco", Buffer.concat([box("ispe", Buffer.alloc(12), 0)]))),
        ]),
      ),
    ]),
  },
  icns: {
    expected: "Invalid ICNS entry length",
    payload: Buffer.from("69636e73000000106963303700000000", "hex"),
  },
  jxl: {
    expected: "Invalid JXL partial codestream box size",
    payload: Buffer.concat([
      box("JXL ", Buffer.from("0d0a870a", "hex")),
      box("ftyp", Buffer.from("jxl \0\0\0\0jxl ", "binary")),
      box("jxlp", Buffer.alloc(4), 0),
    ]),
  },
};

for (const [format, { expected, payload }] of Object.entries(malformedImages)) {
  test(`rejects the non-progressing ${format} payload`, () => {
    const source = `
      import { imageSize } from "image-size";
      try {
        imageSize(Buffer.from("${payload.toString("hex")}", "hex"));
        process.exitCode = 2;
      } catch (error) {
        process.stdout.write(error.message);
      }
    `;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", source], {
      cwd: root,
      encoding: "utf8",
      timeout: 1_000,
    });

    assert.equal(result.error, undefined, `${format} parser did not terminate`);
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(result.stdout, expected);
  });
}
