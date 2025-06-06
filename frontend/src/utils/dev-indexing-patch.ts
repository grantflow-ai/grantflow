/**
 * Development-only patch for triggering file indexing
 * This is a temporary workaround for fake-gcs-server not sending Pub/Sub events
 * TODO: Remove this when GCS emulator Pub/Sub integration is fixed
 */

import { getEnv } from "./env";
import { logError } from "./logging";

const INDEXER_URL = "http://localhost:8001";
const RETRY_DELAY = 1000;
const MAX_RETRIES = 3;

interface GCSEventData {
	bucket: string;
	name: string;
}

/**
 * Extracts the object path from a signed upload URL
 * The URL format includes the object name as a query parameter
 */
export function extractObjectPathFromUrl(uploadUrl: string): null | string {
	try {
		const url = new URL(uploadUrl);

		const name = url.searchParams.get("name");
		if (name) {
			return name;
		}

		const pathMatch = /\/o\/([^?]+)/.exec(uploadUrl);
		if (pathMatch) {
			return decodeURIComponent(pathMatch[1]);
		}
	} catch (error) {
		logError({ error, identifier: "[Dev Indexing Patch] Failed to parse URL" });
	}

	return null;
}

/**
 * Triggers file indexing in development by directly calling the indexer
 * This simulates the Pub/Sub event that would normally be sent by GCS
 */
export async function triggerDevIndexing(objectPath: string): Promise<void> {
	if (process.env.NODE_ENV !== "development") {
		return;
	}

	const apiUrl = getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL;
	if (!apiUrl.includes("localhost")) {
		return;
	}

	// eslint-disable-next-line no-console
	console.log("[Dev Indexing Patch] Triggering indexing for:", objectPath);

	const eventData: GCSEventData = {
		bucket: "grantflow-uploads",
		name: objectPath,
	};

	const encodedData = btoa(JSON.stringify(eventData));

	const pubsubMessage = {
		message: {
			attributes: {
				bucketId: "grantflow-uploads",
				eventType: "OBJECT_FINALIZE",
				objectId: objectPath,
			},
			data: encodedData,
			message_id: `dev-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
			publish_time: new Date().toISOString(),
		},
	};

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(INDEXER_URL, {
				body: JSON.stringify(pubsubMessage),
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			});

			if (response.ok) {
				// eslint-disable-next-line no-console
				console.log("[Dev Indexing Patch] Successfully triggered indexing");
				return;
			}

			const errorText = await response.text();
			logError({
				error: new Error(errorText),
				identifier: `[Dev Indexing Patch] Indexer returned ${response.status}`,
			});
		} catch (error) {
			logError({ error, identifier: `[Dev Indexing Patch] Attempt ${attempt} failed` });
		}

		if (attempt < MAX_RETRIES) {
			await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * attempt));
		}
	}

	// eslint-disable-next-line no-console
	console.warn("[Dev Indexing Patch] Failed to trigger indexing after all retries");
}
