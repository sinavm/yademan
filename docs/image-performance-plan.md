# Image delivery performance plan

## Current production pipeline

- The globe uses the archive's WebP thumbnail tree.
- The selected-person card uses the archive's WebP medium tree.
- Original archive URLs remain the fallback if a derivative fails.
- Archive URLs are pinned to a reviewed commit so new archive commits cannot silently alter production assets.
- A shared flag placeholder is excluded from personal portraits.

## Startup and request ordering

The records JSON and image manifest are requested concurrently. The globe and point cloud initialize as soon as records arrive; portrait requests wait until the manifest is loaded or an 8-second abort timeout expires. If the manifest fails, original source URLs remain available as fallback. When the manifest settles, mounted photo nodes and an open detail card are refreshed.

Manifest rows remain backward-compatible with the existing `n`, `p`, and `u` fields. Optional `t` and `d` paths may specify explicit thumbnail and detail assets. Explicit paths take precedence; otherwise the client derives the thumbnail/medium URL from the existing archive-relative path.

## Rights and identity gate

The current `data/approved.json` is empty. An image URL or an archive file is not evidence of identity or reuse permission. Do not bulk-resize, copy, or publish portraits until each item has documented clearance.

A reviewed catalogue should contain a stable non-name identifier, controlled source path, `rights.status = RIGHTS_CLEARED`, source URL, rights holder, exact license or written permission, reviewer, review date, restrictions, and attribution requirements. Never infer identifiers from row order or name alone.

## Reproducible metadata audit

Run:

```sh
python3 -m unittest tests.test_audit_image_delivery
python3 scripts/audit_image_delivery.py
```

The audit reports matching, ambiguous names, invalid paths, duplicate-name groups, shared-flag references, and derivative coverage. It never claims rights clearance and does not download images.

## Acceptance criteria

1. `node --check assets/site.js` passes.
2. All Python audit tests pass.
3. The globe initializes without waiting for the manifest.
4. No portrait request starts before manifest success/failure/timeout.
5. A failed or stalled manifest still allows the original URL fallback.
6. Explicit `t`/`d` paths take precedence over derived variants.
7. iOS Safari and Android Chrome are tested with cold and warm cache.
8. Before/after LCP, transferred bytes, request count, first-visible-portrait time, and frame pacing are measured.

## Non-goals

- No giant portrait atlas.
- No bulk republication of unverified portraits.
- No unreviewed image rights assumptions.
- No direct push to `main`.
