import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const wrapper = await readFile(
  resolve(root, "ks/website/production/server-deploy.sh"),
  "utf8"
);
const installer = await readFile(
  resolve(root, "ks/website/production/install-deploy-access.sh"),
  "utf8"
);

test("the server wrapper accepts only validated staged candidates", () => {
  assert.match(wrapper, /\[\[ "\$\{EUID\}" -eq 0 \]\]/);
  assert.match(wrapper, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(wrapper, /\^\[0-9\]\+\$/);
  assert.match(wrapper, /staging directory owner must be ksdeploy/i);
  assert.match(wrapper, /flock --exclusive 9/);
  assert.match(wrapper, /KS_PRODUCTION_DEPLOY_SKIPPED/);
  assert.match(wrapper, /KS_PRODUCTION_DEPLOYED/);
});

test("the deploy account is limited to the root-owned wrapper", () => {
  assert.match(installer, /useradd --create-home --shell \/bin\/bash/);
  assert.match(installer, /install -o root -g root -m 0755/);
  assert.match(installer, /NOPASSWD: \$wrapper_target \*/);
  assert.doesNotMatch(installer, /docker \*/i);
});
