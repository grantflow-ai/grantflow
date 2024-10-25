import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import { BlobServiceClient, StorageSharedKeyCredential } from "@azure/storage-blob";

const clientRef = new Ref<BlobServiceClient>();

/**
 * Get the StorageSharedKeyCredential instance.
 * @returns The StorageSharedKeyCredential instance.
 */
export function getStorageSharedKeyCredential() {
	return new StorageSharedKeyCredential(getEnv().AZURE_STORAGE_ACCOUNT_NAME, getEnv().AZURE_STORAGE_ACCOUNT_KEY);
}

/**
 * Get the BlobServiceClient instance.
 * @returns The BlobServiceClient instance.
 */
export function getBlobServiceClient() {
	if (!clientRef.value) {
		clientRef.value = new BlobServiceClient(
			`https://${getEnv().AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`,
			getStorageSharedKeyCredential(),
		);
	}
	return clientRef.value;
}

/**
 * Get the BlobClient instance for the given blob name.
 * @param blobName - The name of the blob.
 * @returns The BlobClient instance.
 */
export function getBlobClient(blobName: string) {
	const blobServiceClient = getBlobServiceClient();

	const containerClient = blobServiceClient.getContainerClient(getEnv().AZURE_STORAGE_CONTAINER_NAME);
	return containerClient.getBlockBlobClient(blobName);
}
