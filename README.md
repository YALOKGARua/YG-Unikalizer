## PhotoUnikalizer

Elegantly anonymize and uniquely process photos: smart resizing, subtle color drift, flexible renaming, rich metadata editing, and realistic fake EXIF/IPTC generation. Built for Windows with Electron + Vite + React.

### Badges

![Electron](https://img.shields.io/badge/Electron-30.x-47848F?logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-149ECA?logo=react&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-0.33-6E4A7E)
![EXIF](https://img.shields.io/badge/EXIF-exiftool--vendored-3B7DDD)
![License](https://img.shields.io/badge/License-MIT-22C55E)

### Highlights

- **Batch processing**: JPG/PNG/WEBP/AVIF with quality control
- **Human‑like uniqueness**: size drift and color drift with safe limits
- **Metadata control**: keep, wipe, or write custom EXIF/IPTC/XMP
- **Fake metadata**: camera/phone/drone presets, serial, lens, ISO, exposure, GPS with presets and randomization
- **Renaming**: tokens `{name}` `{index}` `{ext}` `{date}`
- **Progress UI**: live status and a dedicated “Готовое” tab with outputs

### System requirements

- Windows 10/11 x64
- Node.js 18+ and npm

## Quick start (dev)

```bash
npm install
npm run dev
```

If PowerShell blocks npm, use:

```bash
cmd /c npm install
cmd /c npm run dev
```

## Build (production)

```bash
npm run build
cmd /c npm run start
```

## Release

- Bump version in `package.json` (or run `npm run release:patch` / `:minor` / `:major`).
- Push to `main`.
- CI auto-tags `vX.Y.Z` and triggers Release workflow.
- Release will publish NSIS installer and Portable .exe to GitHub Releases.

## Tech stack

- Electron main/preload for secure IPC
- React + Vite for renderer UI
- Sharp for image pipeline
- exiftool‑vendored for precise metadata I/O

## Project scripts

```bash
npm run dev
npm run build
npm run start
npm run dist 
```

## License

MIT © YALOKGAR