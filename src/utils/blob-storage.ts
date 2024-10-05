import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import {
	BlobSASPermissions,
	BlobServiceClient,
	StorageSharedKeyCredential,
	generateBlobSASQueryParameters,
} from "@azure/storage-blob";

const URL_EXPIRATION_SECONDS = 600;

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

/**
 * Deletes the blob with the given name.
 * @param blobName - The name of the blob.
 * @returns A BlobPromiseResponse instance
 *
 */
export async function deleteBlob(blobName: string) {
	const blobClient = getBlobClient(blobName);
	return await blobClient.delete();
}

/**
 * Generates a signed URL for the given blob name.
 * @param blobName - The name of the blob.
 * @returns The signed URL.
 */
export function generateSignedUrl(blobName: string): string {
	const blobClient = getBlobClient(blobName);
	const url = new URL(blobClient.url);

	const permissions = BlobSASPermissions.from({
		read: true,
		write: true,
		create: true,
	});

	const sasToken = generateBlobSASQueryParameters(
		{
			containerName: getEnv().AZURE_STORAGE_CONTAINER_NAME,
			blobName,
			permissions,
			expiresOn: new Date(Date.now() + URL_EXPIRATION_SECONDS * 1000),
		},
		getStorageSharedKeyCredential(),
	);

	url.search = sasToken.toString();

	return url.toString();
}
