# Patched `image-size` runtime

This directory contains the top-level runtime from `image-size@2.0.2`, retained
under its MIT license solely because `vinext@0.2.1` imports the named
`imageSize` export while building static metadata routes.

The upstream repository is archived and has no release that fixes
`GHSA-5p2g-fcmc-qvqq` or `GHSA-w3rx-r6r6-pgpr`. This local package therefore
uses version `2.0.3-patched.1` and rejects malformed HEIF `ispe`, ICNS entry,
and JXL `jxlp` lengths before their parser offsets can stop advancing. The
regression coverage lives in `../../tests/image-size-security.test.mjs`.

Remove this override when `vinext` no longer depends on the affected release or
when a maintained, patched upstream package is available.
