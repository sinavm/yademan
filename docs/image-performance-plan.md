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

## Globe rotation and portrait scheduling

Portrait overlays are DOM elements, so they do not share the WebGL globe's depth buffer. The renderer now filters points to the camera-facing hemisphere before creating overlays; this prevents portraits on the rear of the sphere from appearing over the visible surface. Visible portraits are ranked by distance to the viewport center, with surface depth as a tie-breaker, so the set follows the area currently in view as the globe rotates.

The previous hard limits (30 low-end / 40 mobile / 56 desktop) could make the globe look as though it stopped revealing people even when more records were in view. The updated limits are 48 / 76 / 120 visible portraits, with DOM retention caps of 72 / 112 / 168 and a modestly larger bounded network queue. The refresh cadence is also shorter, while remaining device-aware. These are upper bounds, not a promise that every record is simultaneously visible; camera framing and screen area still determine the candidate set.

The selected-photo queue continues to prioritize portraits near the viewport center. Automated contract tests guard the new selection policy and limits. Real-device frame pacing and network behavior still require Lighthouse and iOS Safari / Android Chrome validation after deployment.

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
