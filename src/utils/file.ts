import { FileAttributes } from "@/components/files-display";

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

/**
 * Upload files to the server
 *
 * @param files - The files to upload
 * @param databaseFiles - The files already in the database
 *
 * @returns an object containing the new files and the filtered files
 */
export function filterFiles(files: FileAttributes[], databaseFiles: Record<string, FileAttributes> | null) {
	const newFiles = files.filter((file) => file instanceof File);
	const distinctFileIdentifiers = new Set(newFiles.map((file) => file.name + file.size.toString() + file.type));

	const filteredFiles = Object.fromEntries(
		Object.entries(databaseFiles ?? {}).filter(
			// eslint-disable-next-line no-unused-vars
			([_, { name, size, type }]) => !distinctFileIdentifiers.has(name + size.toString() + type),
		),
	);

	return { newFiles, filteredFiles };
}
