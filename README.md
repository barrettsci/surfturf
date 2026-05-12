# Map App

A mobile-first PWA for tracking hunting, fishing, and diving locations offline. Runs in Chrome on Android — no app store required.

## Features

- **OpenTopoMap topo map** with satellite toggle
- **Pin your spots** — tap to drop a pin, pick a category, add notes later
- **Activity profiles** — Hunting, Fishing, Diving each with their own categories and pin colors
- **Offline maps** — draw a bounding box, name it, download tiles for use without cell service
- **GeoJSON export** — back up all your pins to a file on demand
- **Installable** — "Add to Home Screen" in Chrome for a native app feel

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

**Windows (PowerShell):** Node is not on the PATH by default. Run these first:

```powershell
# One-time: allow local scripts to run
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Each session: add Node to PATH
$env:PATH = "C:\Program Files\nodejs;" + $env:PATH

npm run dev
```

## Testing

**Unit tests** (storage CRUD, export logic, tile math) — uses Vitest with a fake IndexedDB, runs in ~1s:

```bash
npm test
```

Watch mode for development:

```bash
npm run test:watch
```

**E2E tests** (full browser flows via Playwright) — starts the dev server automatically:

```bash
npm run test:e2e
```

Interactive UI debugger (step through tests visually):

```bash
npm run test:e2e:ui
```

> Playwright browsers are installed automatically on first run. If prompted, run `node node_modules/@playwright/test/cli.js install chromium` once.

## Deployment

Push to the `main` branch of a GitHub repo. GitHub Actions builds and deploys automatically.

First-time setup:
1. Create a GitHub repo and push this code to `main`
2. Go to **Settings → Pages → Source** and set it to **GitHub Actions**
3. The next push will deploy — your app will be live at `https://<your-username>.github.io/<repo-name>`

## Customizing profiles

Edit [`src/config/profiles.json`](src/config/profiles.json) to change activity types, categories, and pin colors. No code changes needed.

```json
{
  "id": "hunting",
  "name": "Hunting",
  "color": "#e67e22",
  "categories": ["Deer Sighting", "Wallow", ...]
}
```

## Tech stack

| Piece | Choice |
|---|---|
| Build tool | Vite |
| Map | Leaflet.js |
| Tiles | OpenTopoMap (topo) + ESRI World Imagery (satellite) |
| Storage | IndexedDB via `idb` |
| Offline tiles | Cache API |
| PWA | `vite-plugin-pwa` / Workbox |
| Hosting | GitHub Pages |


## Sambar hunting area overlay

Sambar hunting areas are sourced from https://discover.data.vic.gov.au/dataset/hunting-area-dataset-permitted-sambar-deer-hunting-view  
Download Geographicals in GDA94 as ESRI shapefiles, and convert to GeoJSON at https://mapshaper.org  
Save to public/data/sambar-hunting.geojson  
Update regularly!  