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

The temporary GitHub Pages address is:

`https://studiorobbe.github.io/studiorobbe/`

The Astro `site` and `base` settings can be updated when the custom domain is connected.
