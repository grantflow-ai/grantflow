"use server";

import { getEnv } from "@/utils/env";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = "eu-central-1";
const BUCKET_NAME = "bucketName";
const URL_EXPIRATION_SECONDS = 600;

const s3Client = new S3Client({
	region: REGION,
	credentials: {
		accessKeyId: getEnv().AWS_ACCESS_KEY_ID,
		secretAccessKey: getEnv().AWS_SECRET_ACCESS_KEY,
	},
});

async function generateSignedUrl(bucketName: string, objectKey: string, mimeType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: bucketName,
		Key: objectKey,
		ContentType: mimeType,
	});
	return await getSignedUrl(s3Client, command, { expiresIn: URL_EXPIRATION_SECONDS });
}

/**
 * Generates upload URLs for the given file identifiers using AWS s3
 *
 * @param fileIdsAndMimeTypes - An array of file identifiers and their corresponding mime types
 * @returns A map of file identifiers to their corresponding upload URLs
 */
export async function generateUploadUrls(fileIdsAndMimeTypes: [string, string][]): Promise<Map<string, string>> {
	const results = await Promise.all(
		fileIdsAndMimeTypes.map(async ([fileId, mimeType]) => {
			const signedUrl = await generateSignedUrl(BUCKET_NAME, fileId, mimeType);
			return [fileId, signedUrl];
		}),
	);
	return new Map<string, string>(results as []);
}
