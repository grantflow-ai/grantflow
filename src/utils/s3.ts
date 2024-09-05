import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import { S3Client } from "@aws-sdk/client-s3";

const REGION = "eu-central-1";
const clientRef = new Ref<S3Client>();

/**
 * Get the S3 client instance.
 * @returns - The S3 client instance.
 */
export function getS3Client() {
	if (!clientRef.value) {
		clientRef.value = new S3Client({
			region: REGION,
			credentials: {
				accessKeyId: getEnv().AWS_ACCESS_KEY_ID,
				secretAccessKey: getEnv().AWS_SECRET_ACCESS_KEY,
			},
		});
	}

	return clientRef.value;
}
