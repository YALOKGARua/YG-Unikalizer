## PhotoUnikalizer

Anonymize and uniquely process photos at scale. Smart resizing, subtle color drift, flexible renaming, rich metadata editing, realistic fake EXIF/IPTC — now with native C++ acceleration.

### Badges

![Electron](https://img.shields.io/badge/Electron-30.x-47848F?logo=electron&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-149ECA?logo=react&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-0.33-6E4A7E)
![EXIF](https://img.shields.io/badge/EXIF-Native%20XMP%2FEXIF-3B7DDD)
![License](https://img.shields.io/badge/License-MIT-22C55E)

### Highlights

- **Formats**: JPG, PNG, WEBP
- **Uniqueness**: controlled size and color drift
- **Metadata**: keep/wipe/write EXIF/IPTC/XMP (embedded; GPS cleanup)
- **Fake EXIF**: camera/phone/drone presets, ISO/exposure/GPS, serial/lens/software
- **Naming**: tokens `{name}` `{index}` `{ext}` `{date}` `{uuid}` `{rand}`
- **Native acceleration**: C++ addon for fast hashing and scanning, prebuilt in installer
- **Perceptual similarity**: aHash/dHash/pHash + Hamming distance; duplicate groups
- **Progress**: ETA, speed, live updates, system notifications
- **Changelog**: GitHub Release notes + local CHANGELOG
- **Localization**: 16+ languages with in‑app selector (persisted)

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

1. Update `CHANGELOG.md` and bump version (`npm run release:patch|minor|major`).
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