# Image delivery performance plan

## Phase 1 — prevent premature and misrouted portrait requests

Implemented in the frontend:

- The records JSON and image manifest are fetched concurrently.
- Portrait rendering is gated until the manifest has either loaded or failed.
- The globe and point cloud can initialize while the manifest is being fetched.
- A selected detail card is refreshed when the manifest settles.
- A manifest failure or an 8-second timeout still allows the existing source-URL fallback; a stalled index cannot block portrait rendering forever.
- The renderer can use optional `t` (thumbnail) and `d` (detail) paths in manifest rows. Existing `p` rows remain compatible.
- Globe photo nodes request the thumbnail variant; the selected person card requests the detail variant.

This fixes a concrete race in which photo nodes could start requesting original upstream URLs before the local manifest was ready.

## Phase 2 — rights-gated multi-size image pipeline

The frontend now accepts optional thumbnail/detail paths, but no derivative images are generated or published by this change.

The current public data source is `data/javidnams_data.json`. The repository's `data/approved.json` is currently empty, and the content policy explicitly says imported rows and image URLs are not publication approval. The current image manifest has no per-image rights evidence. Therefore it would be unsafe to bulk-copy or resize the current portrait collection into new public assets.

Before activating derivative generation, the project needs a reviewed, stable-ID catalogue whose entries include:

- a stable, non-name identifier;
- a local or controlled source asset path;
- `rights.status = RIGHTS_CLEARED`;
- source URL, rights holder, exact license or written permission;
- reviewer and review date;
- publication restrictions and attribution requirements, where applicable.

Only those entries may produce derivatives. The intended outputs are:

- thumbnail: WebP, approximately 160 × 200 pixels, quality 76–80;
- detail: WebP, approximately 360 × 450 pixels, quality 78–82;
- original: retained separately when retention and publication rights permit it.

The manifest should use stable IDs rather than names and expose separate `thumb` and `detail` URLs. The current name-based manifest remains a compatibility layer until the public records dataset itself has stable IDs. Do not infer IDs from row order.

## Reproducible audit

Run:

```sh
python3 -m unittest tests.test_audit_image_delivery
python3 scripts/audit_image_delivery.py
```

The audit is metadata-only. It reports matching, ambiguous names, invalid archive paths, and current thumbnail/detail coverage. It deliberately does not claim that any image is rights-cleared and does not download remote portraits.

## Acceptance checks before production rollout

1. `node --check assets/site.js` passes.
2. Python audit tests pass.
3. First-load network trace shows the manifest settles before any portrait request begins.
4. With a slow manifest response, the globe still initializes and no original portrait URL is requested early.
5. With a failed manifest, the fallback path remains usable.
6. Thumbnail and detail URLs are requested independently once approved variants exist.
7. iOS Safari and Android Chrome are tested on cold cache and warm cache.
8. Compare LCP, image request count, transferred image bytes, and time-to-first-visible-portrait before/after.

## Explicit non-goals

- No single giant image atlas for all portraits.
- No bulk republication of unverified or rights-uncleared portraits.
- No change to the visual design or globe layout.
- No direct push to `main`.
