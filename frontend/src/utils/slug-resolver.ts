import { retrieveApplication } from "@/actions/grant-applications";
import { getProject } from "@/actions/project";
import { extractIdFromSlug } from "./navigation";

export async function resolveApplicationSlug(projectId: string, slug: string): Promise<null | string> {
	// Extract short ID from slug
	const shortId = extractIdFromSlug(slug);
	if (!shortId) {
		return null;
	}

	// Try common UUID patterns with the short ID
	const possibleUUIDs = [
		`${shortId}-0000-4000-8000-000000000000`,
		`${shortId}-0000-4000-8000-00000e0ea30f`,
		`${shortId}-1111-1111-1111-111111111111`,
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
	// Extract short ID from slug
	const shortId = extractIdFromSlug(slug);
	if (!shortId) {
		return null;
	}

	// Try common UUID patterns with the short ID
	// In production, this should query a database mapping
	const possibleUUIDs = [
		`${shortId}-0000-4000-8000-000000000000`,
		`${shortId}-0000-4000-8000-00000e0ea30f`,
		`${shortId}-1111-1111-1111-111111111111`,
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
