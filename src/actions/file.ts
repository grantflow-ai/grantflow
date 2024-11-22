"use server";

import { getBlobClient } from "@/utils/blob-storage";
import { ApplicationSection, NewApplicationFile } from "@/types/database-types";

/**
 * Upload files to Azure Blob Storage.
 *
 * @param applicationId - The id of the application the files are associated with.
 * @param files - The files to upload.
 * @param sectionName - The name of the section the files are associated with.
 * @param workspaceId - The id of the workspace the application is associated with.
 *
 * @returns A record mapping file names to blob urls.
 */
export async function uploadFiles({
	applicationId,
	files,
	sectionName,
	workspaceId,
}: {
	applicationId: string;
	files: File[];
	sectionName: ApplicationSection;
	workspaceId: string;
}): Promise<NewApplicationFile[]> {
	const promises = files.map(async (file) => {
		const blobName = `${workspaceId}/${applicationId}/${sectionName}/${file.name}`;
		const client = getBlobClient(blobName);
		const arrayBuffer = await file.arrayBuffer();

		await client.uploadData(arrayBuffer, {
			blobHTTPHeaders: { blobContentType: file.type },
		});

		return {
			name: file.name,
			size: file.size,
			type: file.type,
			blobUrl: client.url,
			applicationId,
			section: sectionName,
		} satisfies NewApplicationFile;
	});

	return await Promise.all(promises);
}
