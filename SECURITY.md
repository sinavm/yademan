# Security Policy

## Supported versions

Security fixes are applied to the current default branch (`main`). Older
commits, forks, and unmaintained copies are not supported.

## Reporting a vulnerability

Please do not publish exploit details, credentials, personal data, or an
unpatched vulnerability in a public issue or pull request.

Use GitHub's private vulnerability reporting flow for this repository
(`Security → Advisories → Report a vulnerability`) if it is available.
Otherwise, contact the repository owner through the contact options on the
`sinavm` GitHub profile and include:
- affected file, workflow, or component;
- impact and conditions required to reproduce;
- a minimal proof of concept, with real secrets and personal data removed;
- any suggested mitigation.

Please allow reasonable time for investigation and a coordinated fix before
public disclosure. Do not include live access tokens, private keys, or
unredacted personal information in the report.

## Secret handling

- Store upstream source URLs and credentials in GitHub Actions Secrets, not in
  source files, commits, issues, or logs.
- Use the minimum token permissions needed by each workflow.
- Rotate any credential that may have been exposed.
- Never place private review material or raw personal information in workflow
  artifacts or public deployment output.
