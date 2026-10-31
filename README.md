# Damn Fast Media Viewer

[![CI](https://github.com/c4lyp5o/dfiv-tauri/actions/workflows/ci.yml/badge.svg)](https://github.com/c4lyp5o/dfiv-tauri/actions/workflows/ci.yml)

A fast, cross-platform desktop media viewer built with React, Tauri, and SQLite. Browse your drives directly, or import folders into a searchable media library. Images and audio play in the webview; video plays through [libmpv](https://mpv.io/).

## Features

- **File Explorer:** Browse local drives, mounted volumes and your home folder with keyboard (↑ ↓ Enter) or mouse. Back/forward history, file sizes, auto-refresh, hidden dotfiles.
- **Media Library:** Right-click a folder → *Add to library* to import it into a local SQLite database, then switch between Images / Audio / Video tabs and search by name.
- **Media Preview:** Images open fitted to the window; scroll to zoom, drag to pan, double-click to reset. Audio plays in a now-playing card; video plays through libmpv with hardware decoding (seek, volume, pixelated "privacy" mode).
- **File actions:** Floating toolbar with image details and a two-step delete (from disk in Explorer, from the library in Library).
- **Dark, resizable layout:** Drag the sidebar edge (or focus it and use ← →) to resize; the width is remembered.
- **Settings:** Library stats, live import progress, and a confirmed library reset.
- **Cross-Platform:** Windows, macOS, and Linux.

Supported formats: `jpg jpeg png gif bmp webp tiff svg avif heic` · `mp3 wav ogg flac aac` · `mp4 webm mov avi mkv`.

## Install

Download the installer for your platform from [Releases](https://github.com/c4lyp5o/dfiv-tauri/releases).

| Platform | Package | Also needs |
|---|---|---|
| Windows | `.msi` / `.exe` | nothing (libmpv is bundled) |
| macOS (Apple Silicon / Intel) | `.dmg` | `brew install mpv` |
| Linux (Debian/Ubuntu) | `.deb` | pulled in automatically (`libmpv2`) |
| Linux (Fedora/RHEL) | `.rpm` | pulled in automatically (`mpv-libs`, from RPM Fusion) |

Builds are unsigned: on Windows click through SmartScreen, and on macOS right-click → Open the first time (or run `xattr -dr com.apple.quarantine "/Applications/Damn Fast Media Viewer.app"`).

## Development

### Prerequisites

- [Bun](https://bun.sh/)
- [Rust](https://www.rust-lang.org/tools/install) (stable, 1.85+ for edition 2024)
- The [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS. On Debian/Ubuntu:
  ```sh
  sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  ```

### Video playback (libmpv)

Video is rendered by libmpv via `tauri-plugin-libmpv`, which loads `libmpv-wrapper` from `src-tauri/lib/`.

- **Windows:** `libmpv-2.dll` and `libmpv-wrapper.dll` are already in `src-tauri/lib/`.
- **macOS:** `brew install mpv`, then `scripts/fetch-libmpv-wrapper.sh`.
- **Linux:** `sudo apt install libmpv-dev` (or your distro's equivalent), then `scripts/fetch-libmpv-wrapper.sh`.

On macOS and Linux this step is required before building: the bundle config packages only that platform's wrapper (not the 94 MB Windows DLL). The script downloads the pinned [libmpv-wrapper](https://github.com/nini22P/libmpv-wrapper/releases) release for your OS/CPU, verifies its SHA-256, and puts it in `src-tauri/lib/`. Pass a platform (`linux-x86_64`, `linux-aarch64`, `macos-aarch64`, `macos-x86_64`) to override detection.

### Run

```sh
bun install
bun run tauri dev
```

### Checks

```sh
bun run lint                 # Biome
bun run test                 # Vitest (frontend reducers)
bun run build                # Vite production build
cd src-tauri
cargo clippy --all-targets -- -D warnings
cargo test                   # Rust unit tests (DB queries, folder listing, import scan)
```

CI runs all of these on every push to `main` and every pull request; the Rust checks run on Windows, macOS, and Linux.

## Releasing

1. Bump the version in `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `package.json`, and add a section to [CHANGELOG.md](CHANGELOG.md).
2. Commit, then tag and push: `git tag v1.2.0 && git push origin v1.2.0`.
3. The [Release workflow](.github/workflows/release.yml) builds Windows, Linux (`.deb`, `.rpm`), and macOS (Apple Silicon and Intel) installers into a **draft** GitHub release.
4. Review the draft and publish it.

The workflow can also be started manually from the Actions tab.

## Project Structure

- `src/views/Main.jsx` — layout: sidebar (explorer or library) + viewer/settings
- `src/components/FileExplorer/` — drive/folder browser and file options panel
- `src/components/MediaManager/` — virtualized media library with type filters and search
- `src/components/Viewer.jsx`, `VideoControls.jsx` — image/audio preview and the libmpv video player
- `src/context/DFMVContext.jsx` — app state (UI reducer + DB task reducer) and providers
- `src/hooks/` — SWR hooks for folder listings and library queries
- `src-tauri/src/main.rs` — Rust backend: filesystem commands and the SQLite media library
- `src-tauri/tauri.*.conf.json` — per-platform bundle config (where libmpv-wrapper is packaged)
- `scripts/fetch-libmpv-wrapper.sh` — fetches libmpv-wrapper for macOS/Linux

The library database lives at `dfiv.db` in the OS app-config directory (e.g. `%APPDATA%\com.c4lyp5o.dfmv` on Windows).

## Platform Notes

- **macOS:** the window is transparent so mpv can draw behind the webview, which requires Tauri's `macOSPrivateApi`. That rules out Mac App Store distribution.
- **Linux:** the app forces `GDK_BACKEND=x11` (XWayland) because mpv can't embed into a native Wayland window. Set `GDK_BACKEND` yourself to override. AppImage isn't built, since it wouldn't include libmpv.

## License

MIT
