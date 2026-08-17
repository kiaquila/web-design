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
const sshCommand = await readFile(
  resolve(root, "ks/website/production/ssh-command.sh"),
  "utf8"
);

test("the server wrapper accepts only validated staged candidates", () => {
  assert.match(wrapper, /\[\[ "\$\{EUID\}" -eq 0 \]\]/);
  assert.match(wrapper, /\^\[a-f0-9\]\{40\}\$/);
  assert.match(wrapper, /\^\[0-9\]\+\$/);
  assert.match(wrapper, /staging directory owner must be ksdeploy/i);
  assert.match(wrapper, /flock --exclusive 9/);
  assert.match(wrapper, /KS_PRODUCTION_DEPLOY_REGISTERED/);
  assert.match(wrapper, /KS_PRODUCTION_DEPLOY_SKIPPED/);
  assert.match(wrapper, /KS_PRODUCTION_DEPLOYED/);
  assert.match(wrapper, /Requested revision is absent from the trusted source mirror/);
  assert.match(wrapper, /Staged deployment payload does not match the trusted source revision/);
  assert.match(wrapper, /Current trusted main ks tree differs from the registered candidate/);
  assert.match(wrapper, /-g ksdeploy -m 0710/);
  assert.match(wrapper, /diff --recursive --brief --no-dereference/);
  assert.match(wrapper, /trap cleanup EXIT/);
  assert.match(wrapper, /rsync --archive --delete --chown=root:root "\$trusted_payload\//);
  assert.match(
    wrapper,
    /docker inspect --format '\{\{index \.Config\.Labels "org\.opencontainers\.image\.revision"\}\}'/
  );
  assert.doesNotMatch(wrapper, /Labels \\"org\.opencontainers\.image\.revision\\"/);
});

test("the deploy account is limited to the root-owned wrapper", () => {
  assert.match(installer, /useradd --create-home --shell \/bin\/bash/);
  assert.match(installer, /install -o root -g root -m 0755/);
  assert.match(installer, /NOPASSWD: \$wrapper_target \*/);
  assert.match(installer, /restrict,command=/);
  assert.match(installer, /chown root:root "\/home\/\$deploy_user\/.ssh\/authorized_keys"/);
  assert.match(installer, /ssh-command\.sh/);
  assert.match(installer, /ks-production-source/);
  assert.match(installer, /git init --bare/);
  assert.match(installer, /chmod 0700 "\$source_git_dir"/);
  assert.match(installer, /-g "\$deploy_user" -m 0710/);
  assert.doesNotMatch(installer, /docker \*/i);
});

test("the deploy key has no arbitrary SSH command path", () => {
  assert.match(sshCommand, /SSH_ORIGINAL_COMMAND/);
  assert.match(sshCommand, /Rejected SSH command/);
  assert.match(sshCommand, /wrapper=.*ks-production-deploy/);
  assert.match(sshCommand, /\$wrapper\\ register/);
  assert.match(sshCommand, /\$wrapper\\ deploy/);
  assert.match(sshCommand, /tar -xf - -C/);
  assert.doesNotMatch(sshCommand, /bash -c/);
});
