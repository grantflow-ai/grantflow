/**
 * Format bytes to human readable string
 * @param bytes - The bytes to format
 * @param opts - The options for formatting
 * @returns The formatted bytes as a string
 * @throws Error if bytes is negative
 */
export function formatBytes(
	bytes: number,
	opts: {
		decimals?: number;
		sizeType?: "accurate" | "normal";
	} = {},
): string {
	if (bytes < 0) {
		throw new Error("Bytes cannot be negative");
	}

	const { decimals = 0, sizeType = "normal" } = opts;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
	const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];

	if (bytes === 0) {
		return "0 Bytes";
	}

	const base = sizeType === "accurate" ? 1024 : 1000;
	const i = Math.floor(Math.log(Math.max(bytes, 1)) / Math.log(base));
	const selectedSizes = sizeType === "accurate" ? accurateSizes : sizes;
	const size = selectedSizes[Math.min(i, selectedSizes.length - 1)];

	if (bytes < 1) {
		return `${bytes.toFixed(decimals)} ${size}`;
	}

	const value = bytes / base ** i;
	return `${value.toFixed(decimals)} ${size}`;
}
