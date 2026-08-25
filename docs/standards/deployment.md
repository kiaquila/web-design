# Deployment

Deployment configuration belongs to the project repository; credentials belong
to the hosting platform's environment-scoped secret store. The shared baseline
never contains customer domains, account identifiers, Worker IDs, private keys,
or production tokens.

Production changes require explicit authorization, green checks for the exact
commit, a recorded target and expected revision, post-deploy verification, and
a rollback point. Pull requests use isolated previews where the platform
supports them. A migration must not leave two repositories competing to deploy
the same target.

The `custom-production` profile does not grant deployment permission. It marks
the workflow as project-owned and requires its verification and rollback
contract to be documented and tested. A write-capable manual deployment job
uses the exact GitHub environment name `production`; the owner restricts that
environment to the default branch before the workflow is introduced. Hosting
targets, platform environment names, domains, and credentials remain
project-owned.
