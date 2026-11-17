# Automated source database synchronization

The website's globe dataset is stored at `data/javidnams_data.json`.

## Configure the source

In the repository, open **Settings → Secrets and variables → Actions** and add a
repository secret named `JAVIDNAM_SOURCE_URL`. Its value must be an HTTPS GitHub
file URL pointing to a JSON array (a GitHub `blob` URL or a
`raw.githubusercontent.com` URL is supported). A repository Actions variable
with the same name is also supported, but a secret is preferred.

The URL is read at runtime. It is not embedded in the website JavaScript,
HTML, database, or workflow source.

## Schedule and behavior

- Runs automatically every three days at 03:17 UTC.
- Can also be started manually from **Actions → Sync Javidnam source database → Run workflow**.
- Downloads the configured file, validates JSON, record structure, image URLs,
  non-empty names, and dataset size before touching the local database.
- Preserves optional `age`, `place`, and `date` fields. Missing image URLs are
  allowed so the frontend can show its existing dark image placeholder.
- Refuses suspiciously small datasets, unexpected fields, invalid records, or
  a decrease of more than 5% in record count. Such a change needs manual review.
- Compares normalized JSON content. If there is no real change, it exits
  successfully without a commit or pull request.
- If content changes and passes validation, the workflow creates a dedicated
  automation branch and opens a pull request containing only
  `data/javidnams_data.json`. It does not push directly to `main`.
- Merge the generated pull request after review; the normal Pages deployment
  workflow then publishes the update from `main`.

Using a pull request keeps the scheduled sync compatible with branch protection
and ensures a person can review dataset changes before publication.

The workflow requires GitHub Actions to be enabled and the repository token to
have `contents: write` and `pull-requests: write` permissions.
