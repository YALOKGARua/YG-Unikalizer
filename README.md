## PhotoUnikalizer 2.4

Anonymize and uniquely process photos at scale. Smart resizing, subtle color drift, flexible renaming, rich metadata editing, realistic fake EXIF/IPTC — now with native C++ acceleration.

### Badges

![Electron](https://img.shields.io/badge/Electron-30.x-47848F?logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-149ECA?logo=react&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-0.33-6E4A7E)
![EXIF](https://img.shields.io/badge/EXIF-Native%20XMP%2FEXIF-3B7DDD)
![License](https://img.shields.io/badge/License-MIT-22C55E)

### Highlights

- **Formats**: JPG, PNG, WEBP, AVIF, HEIC/HEIF
- **Uniqueness**: controlled size and color drift, max width
- **Metadata**: keep/wipe/write EXIF/IPTC/XMP (embedded; GPS cleanup)
- **Fake EXIF**: advanced presets (camera/phone/action/drone/scanner), ISO/exposure/aperture/focal/GPS, rating/label/title, software/serial
- **Naming**: tokens `{name}` `{index}` `{ext}` `{date}` `{uuid}` `{rand}`
- **Native acceleration**: C++ addon for fast hashing and scanning, prebuilt in installer
- **Faster duplicates**: WIC‑based gray decode for a/d/pHash on Windows, batch hashing in main process, xxHash64 by default
- **Perceptual similarity**: aHash/dHash/pHash + Hamming distance; duplicate groups
- **Progress**: ETA, speed, live updates, system notifications
- **Auto‑update**: forced overlay while downloading; percent, speed, bytes and ETA; one‑click install
- **Changelog/Notes**: GitHub Release notes + local CHANGELOG; in‑app "What’s new" modal
- **Localization**: 16+ languages with selector (persisted)
 - **Fun tab**: Crash and Slots mini‑games; Slots with animated paylines and flexible bets; Crash crashes at a random moment unless you cash out

### System requirements

- Windows 10/11 x64
- No build tools required for users (installer ships prebuilt native module)

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
npm run dist
```

## Release

1. Update `CHANGELOG.md` and bump version (`npm run release:patch|minor|major`). Now at 2.4.0.
2. Windows Explorer integration: create a shortcut to `PhotoUnikalizer.exe` in `%APPDATA%\Microsoft\Windows\SendTo` or install a context menu entry.
2. Build prebuilds if native code changed: `npm run native:prebuild`.
3. Build installer: `npm run dist`.
4. Publish GitHub Release with notes (we display these in-app).

## Tech stack

- Electron (main/preload) for secure IPC
- React + Vite for renderer
- Native addon (N-API) + prebuilds
- Sharp for image pipeline
- Native embedded XMP/EXIF writer (no exiftool)

## Scripts

```bash
npm run dev          
npm run dist     
npm run native:build
npm run native:prebuild  
```

## License

MIT © YALOKGAR