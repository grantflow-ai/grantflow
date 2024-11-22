/**
 * Generate a file download
 *
 * @param filename - The name of the file to download
 * @param content - The content of the file
 * @param type - The type of the file
 *
 * @returns void
 */
export function generateFileDownload({ filename, content, type }: { filename: string; content: string; type: string }) {
	const blob = new Blob([content], { type });

	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;

	document.body.append(link);
	link.click();

	link.remove();
	URL.revokeObjectURL(url);
}
