# Public launch checklist

- [x] Bilingual static landing page
- [x] Responsive layout and reduced-motion support
- [x] GitHub Pages workflow prepared
- [x] Automated upstream source synchronization workflow prepared
- [x] Source URL read from the `JAVIDNAM_SOURCE_URL` Actions secret or variable
- [x] Data governance and rights-review policies documented
- [ ] Confirm the upstream dataset and every image have a documented lawful publication basis
- [ ] Review records individually before describing them as verified or approved
- [ ] Enable Pages with GitHub Actions in repository settings
- [ ] Verify the deployed URL and mobile layout
- [ ] Configure repository branch protection, secret scanning, push protection, and vulnerability reporting
- [ ] Review collaborators and workflow permissions

## Important publication status

The frontend currently fetches `data/javidnams_data.json`. That file is
refreshed from an upstream public source. The public accessibility of that
source does not itself grant republication rights. Imported rows and image
URLs are not automatically verified, approved, or rights-cleared.

The separate `data/approved.json` file is not currently used by the frontend
as its data source. Do not treat its empty state as proof that no records are
currently served by the site.

See `docs/content-policy.md` and `docs/data-rights-policy.md`.
