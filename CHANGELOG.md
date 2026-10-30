# Changelog

All notable changes to Damn Fast Media Viewer are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-10-31

First public release.

### Added
- **File Explorer:** browse drives, mounted volumes and your home folder, with back/forward history, file sizes and keyboard navigation (↑ ↓ Enter).
- **Media Library:** import folder trees into a local SQLite database, then filter by Images / Audio / Video and search by name.
- **Viewer:** images fit the window, with scroll-to-zoom, drag-to-pan and double-click to reset. Audio has a now-playing card. Video plays through libmpv with hardware decoding, seek, volume and a pixelated "privacy" mode.
- **File actions:** image details, and a two-step delete (from disk in Explorer, from the library in Library).
- **Dark UI:** resizable sidebar whose width is remembered, live import progress, and a Settings page with library stats and a confirmed library reset.
- **Platforms:** Windows, macOS (Apple Silicon and Intel) and Linux (`.deb`, `.rpm`).
- **Development:** unit tests (Rust and Vitest), Biome linting, CI on all three OSes, and a tag-triggered release workflow.

### Known limitations
- Builds are unsigned. Windows SmartScreen and macOS Gatekeeper will warn on first launch (see the README).
- macOS and Linux need libmpv installed (`brew install mpv`; on Linux it's a package dependency).
- No AppImage. On Wayland, the app runs under XWayland so mpv can embed.

[1.0.0]: https://github.com/c4lyp5o/dfiv-tauri/releases/tag/v1.0.0
