# Redline website and support

This repository is the public home for the Redline website, user documentation, privacy policy, and support workflow.

**Redline itself is closed-source and proprietary.** The application source code is not present here, and this repository does not grant a license to the Redline product.

## What is included

- A dependency-free, multi-page static website.
- Searchable getting started, workflow, backup/export, browser-support, troubleshooting, FAQ, release-note, and privacy documentation.
- A local-only environment summary builder that helps users prepare public-safe bug context.
- Public bug, feature, and documentation issue forms with privacy guardrails.
- Private security-reporting guidance.
- Direct GitHub Pages publishing from the `main` branch with no build step.

## Preview locally

No build step is required. Serve the repository root over HTTP:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000/`. Opening files directly also works for most pages, but HTTP preview matches GitHub Pages more closely.

Documentation search and the support summary builder require JavaScript, but navigation and all documentation remain readable without it.

## Publish with GitHub Pages

1. Create a public GitHub repository and push this folder as its `main` branch.
2. In **Settings → Pages**, choose **Deploy from a branch** as the source.
3. Select the `main` branch and the repository root (`/`), then save.
4. Push to `main` whenever the site should be republished.
4. Enable **Private vulnerability reporting** in **Settings → Security** so sensitive reports do not become public issues.

GitHub Pages publishes the repository root. Relative links keep the site working at a project URL such as `https://theanarchox.github.io/redline-support/`.

## Deployment settings

Edit [`assets/js/config.js`](assets/js/config.js) before launch:

- `repositoryUrl` is the fallback used for local previews. On a GitHub Pages project site, the repository URL is derived automatically.
- Add `chromeStoreUrl` and `firefoxAddonsUrl` when marketplace listings are live. Store buttons remain hidden while these values are empty.

If the repository owner or name changes, also update the fixed URLs in:

- `.github/ISSUE_TEMPLATE/config.yml`
- `support.html` fallbacks (runtime JavaScript corrects these on GitHub Pages)
- README examples

## Publication checklist

- [ ] Confirm the public repository URL and marketplace URLs.
- [ ] Confirm the privacy-policy effective date, publisher identity, and private contact route meet your legal needs.
- [ ] Enable private vulnerability reporting and test the private-report link while signed out of the maintainer account.
- [ ] Confirm marketplace metadata describes Redline as proprietary and does not identify this support repository as application source.
- [ ] Review each screenshot and policy statement against the release being published.
- [ ] Test the deployed project-path URL, not only the local root URL.

## Public contributions

Issues and pull requests about this website and its documentation can be reviewed here. Application source patches cannot be accepted through this repository because the product source is not included.

Before posting, remove private URLs, research text, notes, tags, dossier names, credentials, tokens, browser-profile data, and unredacted screenshots. Never upload a Redline vault export to a public issue.

See [SUPPORT.md](SUPPORT.md) and [SECURITY.md](SECURITY.md) for the reporting policy.
