/**
 * Format bytes to human readable string
 * @param bytes - The bytes to format
 * @returns The formatted bytes as a string
 * @throws Error if bytes is negative
 */
export function formatBytes(bytes: number): string {
	if (bytes < 0) {
		throw new Error("Bytes cannot be negative");
	}

	const sizes = ["Bytes", "KB", "MB"];

	if (bytes === 0) {
		return "0 Bytes";
	}

	const base = 1024;
	const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(base));
	const size = sizes[Math.min(i, sizes.length - 1)];

	if (bytes < 1) {
		return `${bytes.toFixed(0)} ${size}`;
	}

	const value = bytes / base ** i;
	return `${value.toFixed(0)} ${size}`;
}
