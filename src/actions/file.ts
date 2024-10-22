"use server";

import { generateSignedUrl } from "@/utils/blob-storage";

import type { FileData } from "@/types";

/**
 * Generates upload URLs for the given file identifiers using Azure Blob Storage
 *
 * @param fileData - An array of file data objects
 * @returns A map of file identifiers to their corresponding upload URLs
 */
export async function generateUploadUrls(fileData: FileData[]): Promise<string[]> {
	return Promise.resolve(fileData.map((file) => generateSignedUrl(file.fileId)));
}
