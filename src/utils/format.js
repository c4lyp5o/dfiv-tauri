const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Human-readable size, e.g. 1536 -> "1.5 KB". */
export function formatBytes(bytes) {
	if (!bytes || bytes < 0) return "0 B";
	const exponent = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		BYTE_UNITS.length - 1,
	);
	const value = bytes / 1024 ** exponent;
	return `${Number.parseFloat(value.toFixed(exponent === 0 ? 0 : 1))} ${BYTE_UNITS[exponent]}`;
}

/** Locale-formatted count, treating missing values as 0. */
export function formatCount(count) {
	return new Intl.NumberFormat().format(count ?? 0);
}

/** Last segment of a Windows or POSIX path ("C:\\" and "/" stay as-is). */
export function baseName(path) {
	const segments = path.split(/[\\/]/).filter(Boolean);
	return segments.length > 0 ? segments[segments.length - 1] : path;
}

/** Everything before the last segment of a path. */
export function dirName(path) {
	return path.slice(0, path.length - baseName(path).length).replace(/[\\/]$/, "");
}
