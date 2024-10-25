"use server";

import { getBlobClient } from "@/utils/blob-storage";

/**
 * Upload files to Azure Blob Storage.
 *
 * @param files - The files to upload.
 * @param parentId - The parent ID.
 * @param workspaceId - The workspace ID.
 *
 * @returns A record mapping file names to blob urls.
 */
export async function uploadFiles({
	files,
	parentId,
	workspaceId,
}: {
	files: File[];
	parentId: string;
	workspaceId: string;
}) {
	const promises = files.map(async (file) => {
		const blobName = `${workspaceId}/${parentId}/${file.name}`;
		const client = getBlobClient(blobName);
		const arrayBuffer = await file.arrayBuffer();

		await client.uploadData(arrayBuffer, {
			blobHTTPHeaders: { blobContentType: file.type },
		});

		return [file.name, client.url];
	});

	const results = await Promise.all(promises);

	return Object.fromEntries(results as [string, string][]);
}
