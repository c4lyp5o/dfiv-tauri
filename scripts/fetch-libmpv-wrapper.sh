#!/usr/bin/env bash
# Downloads the pinned libmpv-wrapper build into src-tauri/lib/ and verifies its checksum.
# Usage: scripts/fetch-libmpv-wrapper.sh [linux-x86_64|linux-aarch64|macos-aarch64|macos-x86_64]
# With no argument the platform is detected from `uname`. Windows DLLs are already committed.
set -euo pipefail

VERSION="v0.1.1"
BASE_URL="https://github.com/nini22P/libmpv-wrapper/releases/download/${VERSION}"

detect_platform() {
	local os arch
	case "$(uname -s)" in
		Linux) os="linux" ;;
		Darwin) os="macos" ;;
		*) echo "Unsupported OS: $(uname -s) (Windows DLLs are already in src-tauri/lib)" >&2; exit 1 ;;
	esac
	case "$(uname -m)" in
		x86_64 | amd64) arch="x86_64" ;;
		arm64 | aarch64) arch="aarch64" ;;
		*) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
	esac
	echo "${os}-${arch}"
}

PLATFORM="${1:-$(detect_platform)}"

# From the release's sha256.txt
case "$PLATFORM" in
	linux-x86_64) SHA256="1583564042f10be25166b52b6fe02db6d87cf9cef34985ba517048c044b7eee0"; LIB="libmpv-wrapper.so" ;;
	linux-aarch64) SHA256="94ff6465ae05a86b44e818089270af857657251166bd693caf4a87a53821d943"; LIB="libmpv-wrapper.so" ;;
	macos-aarch64) SHA256="086dbf977fe5b51785048cbd190f1809186513688be0ecea1ad27bd766c55de8"; LIB="libmpv-wrapper.dylib" ;;
	macos-x86_64) SHA256="99d65d7e368a456c883b4b3cf5d6384c9af64ec29dccaf4923548c2e3784b0e4"; LIB="libmpv-wrapper.dylib" ;;
	*) echo "Unknown platform: $PLATFORM" >&2; exit 1 ;;
esac

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${ROOT}/src-tauri/lib"
ZIP="libmpv-wrapper-${PLATFORM}.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "Downloading ${ZIP} (${VERSION})..."
curl -fsSL -o "${TMP}/${ZIP}" "${BASE_URL}/${ZIP}"

if command -v sha256sum >/dev/null; then
	ACTUAL="$(sha256sum "${TMP}/${ZIP}" | cut -d' ' -f1)"
else
	ACTUAL="$(shasum -a 256 "${TMP}/${ZIP}" | cut -d' ' -f1)"
fi
if [ "$ACTUAL" != "$SHA256" ]; then
	echo "Checksum mismatch for ${ZIP}: expected ${SHA256}, got ${ACTUAL}" >&2
	exit 1
fi

mkdir -p "$DEST"
unzip -o -j -q "${TMP}/${ZIP}" "bin/${LIB}" -d "$DEST"
echo "Installed ${DEST}/${LIB}"
