# Yademan | یادمان

A bilingual Persian-English memorial archive dedicated to keeping names and memories alive. No name should be forgotten.

## Public release and data status

This is a public static website. The frontend currently reads
`data/javidnams_data.json`; the scheduled source-sync workflow refreshes that
file from the HTTPS URL configured in the `JAVIDNAM_SOURCE_URL` GitHub Actions
secret or variable. `data/approved.json` is a separate empty file and is not
the dataset currently fetched by `assets/site.js`.

**An imported source row is not automatically verified, approved, or cleared
for republication.** Public availability of a source file or image URL does
not establish reuse permission. Review provenance, identity, image rights,
and privacy before describing or treating any item as verified. See
`docs/data-rights-policy.md` and `docs/content-policy.md`.

## Image assets

- Downloaded photographs are stored in the repository as WebP files under `images/` (3,570 files).
- Dataset records use local WebP paths whenever a matching downloaded image exists; source images that could not be downloaded remain on their original URL (312 records in the imported snapshot).
- `data/image-map.json` maps known source URLs to repository assets, and the source-sync workflow applies that map so later data refreshes keep using local WebP files.
- Image provenance, identity, privacy, and reuse rights still require review before republication; see the data-rights and content policies below.

## Stack

- Semantic HTML
- Responsive CSS with reduced-motion support
- Vanilla JavaScript and Three.js for the interactive globe
- Python 3 for data synchronization and audits
- GitHub Actions for automated synchronization and GitHub Pages deployment

## Local preview

Run `python3 -m http.server 8000` from the repository root and open
`http://localhost:8000`.

## Data governance

- Keep source provenance and retrieval dates traceable.
- Do not publish private contact details, identity numbers, precise residential
  addresses, or unnecessary information about relatives.
- A name-search result, caption, filename, or image URL is not proof of
  identity or image reuse rights.
- Process correction and removal requests promptly.
- Keep private research notes and credentials out of the public repository.

## Rights and security

Original project-owned code, documentation, and design are subject to the
proprietary notice in `LICENSE`. Third-party data, personal information,
photographs, and trademarks are excluded from that claim and remain subject
to their respective rights and applicable law.

See `SECURITY.md` for vulnerability reporting and
`docs/repository-security.md` for repository hardening settings.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` deploys the repository root
when changes are pushed to `main`. Configure Pages with GitHub Actions as
the deployment source in repository settings.
