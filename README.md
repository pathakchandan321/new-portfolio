# Chandan Pathak Portfolio

Static portfolio built with HTML, CSS, and vanilla JavaScript. It has no backend or runtime package dependencies.

## Run locally

```powershell
npm.cmd run dev
```

Then open `http://localhost:5173`.

## Build

```powershell
npm.cmd run lint
npm.cmd run build
```

The production site is written to `dist/`.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds `dist/` and deploys it on pushes to `main`. In the repository, open **Settings → Pages** and choose **GitHub Actions** as the source. The project-site URL is `https://pathakchandan321.github.io/new-portfolio/`.
