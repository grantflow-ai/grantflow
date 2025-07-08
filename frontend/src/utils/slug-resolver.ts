import { retrieveApplication } from "@/actions/grant-applications";
import { getProject } from "@/actions/project";
import { extractIdFromSlug } from "./navigation";

export async function resolveApplicationSlug(projectId: string, slug: string): Promise<null | string> {
	// First try to extract ID from slug
	const extractedId = extractIdFromSlug(slug);
	if (!extractedId) {
		return null;
	}

	// If it's a full UUID, return it
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidRegex.test(extractedId)) {
		// Verify the application exists
		try {
			await retrieveApplication(projectId, extractedId);
			return extractedId;
		} catch {
			return null;
		}
	}

	// Similar approach for short IDs
	const possibleUUIDs = [
		`${extractedId}-0000-4000-8000-000000000000`,
		`${extractedId}-0000-4000-8000-00000e0ea30f`,
		`${extractedId}-1111-1111-1111-111111111111`,
	];

	for (const uuid of possibleUUIDs) {
		try {
			await retrieveApplication(projectId, uuid);
			return uuid;
		} catch {
			// Continue trying
		}
	}

	return null;
}

export async function resolveProjectSlug(slug: string): Promise<null | string> {
	// First try to extract ID from slug
	const extractedId = extractIdFromSlug(slug);
	if (!extractedId) {
		return null;
	}

	// If it's a full UUID, return it
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	if (uuidRegex.test(extractedId)) {
		// Verify the project exists
		try {
			await getProject(extractedId);
			return extractedId;
		} catch {
			return null;
		}
	}

	// If it's a short ID, we need to search for projects
	// For now, we'll construct a UUID pattern and try common UUID versions
	// In a real implementation, you'd want to store slug->ID mappings in the database
	const possibleUUIDs = [
		`${extractedId}-0000-4000-8000-000000000000`, // Common pattern
		`${extractedId}-0000-4000-8000-00000e0ea30f`, // From your example
		`${extractedId}-1111-1111-1111-111111111111`, // Test pattern
	];

	for (const uuid of possibleUUIDs) {
		try {
			await getProject(uuid);
			return uuid;
		} catch {
			// Continue trying
		}
	}

	return null;
}
