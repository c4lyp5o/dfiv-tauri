# Damn Fast Media Viewer

A modern, cross-platform desktop media viewer built with React, Tauri, and SQLite. Features a resizable sidebar, fast file navigation, and support for images, audio, and video files.

## Features

- **Fast File Navigation:** Browse local folders and drives with keyboard or mouse.
- **Resizable Sidebar:** Adjust the sidebar width by dragging the separator.
- **Media Preview:** View images, play audio and video files directly in the app.
- **Info & Delete:** Hovering options panel for file info and deletion.
- **Auto-Refresh:** File list updates automatically every few seconds.
- **Database Integration:** Uses SQLite for storing and retrieving media metadata.
- **Cross-Platform:** Runs on Windows, macOS, and Linux via Tauri.

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Rust & Cargo](https://www.rust-lang.org/tools/install)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites/)

### Install & Run
```sh
bun install
bun run tauri dev
```

## Project Structure
- `src/` — React frontend components
- `src/hooks/` — Custom React hooks (e.g., SWR for file/db polling)
- `src/components/` — UI components (Sidebar, MediaViewer, OptionsPanel)
- `src-tauri/` — Tauri backend (Rust)
- `public/` — Static assets

## Usage
- Use the sidebar to browse folders and select media files.
- Use the options panel (top right) to view info or delete files.
- Resize the sidebar by dragging the vertical separator.

## License
MIT
