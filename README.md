# studio rob•be

The portfolio website for studio rob•be, built as a static Astro site.

## Local development

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Create a production build with:

```sh
npm run build
```

## Deployment

Pushes to `main` are deployed automatically to GitHub Pages through the workflow in `.github/workflows/deploy.yml`.

Before the first deployment, set the repository's **Settings > Pages > Source** to **GitHub Actions**.

The website address is:

`https://www.studiorob.be/`

The custom domain is configured through GitHub Pages.

## Contact form

The homepage uses Formspree through the public form-ID endpoint in
`src/components/ContactForm.astro`. The receiving address belongs only in the
Formspree dashboard. Never add it to source, configuration, documentation, or
commit messages. A build-time check rejects endpoints outside the form-ID format.

The form includes native required/email/length validation, whitespace validation
with JavaScript, an optional company field, and the Formspree `_gotcha` honeypot.
Submissions show progress, prevent duplicate clicks, and retain values on failure.
After 20 seconds, an unconfirmed-delivery message allows a manual retry. Without
JavaScript the browser posts directly to Formspree. When an AJAX request is rejected,
“Continue with secure submission” uses the hosted flow for any spam verification.
Keep Formspree's dashboard spam protection enabled; honeypots alone do not stop all bots.

Before release, confirm in Formspree that the form is active, the recipient is
verified, and any domain restrictions allow `studiorob.be` and `www.studiorob.be`.
Verify inbox delivery and the hosted challenge with an intentional submission.
Local automated checks mock the service and do not send messages.

```sh
npm run build
node --test tests/contact-form.test.mjs
```

### Email exposure audit — 8 September 2026

The live apex and www homepages, robots.txt, sitemap-index.xml, sitemap-0.xml,
and linked favicon.svg were inspected. The sitemap contains only the homepage;
there are no linked additional public content pages or external script assets.
No plain-text email addresses, mailto links, or common encoded email markers were
found in these text resources or in the site's source and built text assets.
This covers the current discoverable site, not historical deployments, Git history,
search-engine caches, or unknown unlinked URLs.

### Review state

Prepared locally only; nothing pushed or deployed. The GitHub Pages workflow is
unchanged. The separate older Google Drive placeholder was not modified.
