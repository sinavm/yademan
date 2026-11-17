# Repository security and protection checklist

## Repository-level controls to enable in GitHub Settings

These are repository administration settings. They cannot be enabled by
committing files, and must be checked in the GitHub web interface.

- Keep the repository public only if public source visibility is intended.
  Making it private can affect GitHub Pages availability depending on plan.
- Under **Settings → General → Features**, disable **Allow forking** if the
  account/plan exposes that control and forks are not wanted. This does not
  prevent copying material already visible in a public website or by users
  who can access it.
- Under **Settings → Branches** (or **Rules → Rulesets**), protect `main`:
  require a pull request before merging, require at least one approval if
  another reviewer is available, dismiss stale approvals, require approval
  of the most recent push, require status checks, block force pushes, and
  block branch deletion. Do not require an approval from another person if
  nobody else can review; that can lock the owner out of normal changes.
- Require the CodeQL workflow/status check after its first successful run.
- Under **Settings → Code security and analysis**, enable secret scanning and
  push protection if available, Dependabot alerts, and the dependency graph.
- Enable private vulnerability reporting if available.
- Review Actions permissions. Keep the default GITHUB_TOKEN read-only where
  possible; grant write permissions only inside the specific workflow that
  needs them. Restrict actions to trusted publishers and pin third-party
  actions to full commit SHAs for a stricter supply-chain posture.
- Enable automatic deletion of head branches after pull requests are merged.
- Review collaborators and outside collaborators regularly; grant the least
  privilege required.

## Controls represented in this repository

- `SECURITY.md`: coordinated vulnerability disclosure guidance.
- `.github/dependabot.yml`: weekly GitHub Actions dependency update checks.
- `.github/workflows/codeql.yml`: scheduled and change-triggered CodeQL scans
  for JavaScript and Python.
- `LICENSE`: proprietary rights notice for original project-owned code and
  design, not a blanket claim over third-party data or images.
- `docs/data-rights-policy.md`: provenance, image licensing, privacy, and
  removal requirements.

## Important limits

A public repository cannot be made impossible to copy. A proprietary notice
clarifies the rights claimed in original project-owned material, but cannot
override GitHub's Terms of Service, third-party rights, or applicable law.
No repository setting can retroactively create permission to use upstream
data or photographs.
