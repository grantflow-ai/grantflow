import type { UserInfo } from "@/types/user";

/**
 * Gets the list of missing required fields from a user profile
 */
export function getMissingProfileFields(user: null | UserInfo): string[] {
	if (!user) {
		return ["user"];
	}

	const missing: string[] = [];

	if (!user.displayName || user.displayName.trim().length < 2) {
		missing.push("displayName");
	}

	if (!user.email || user.email.trim().length === 0) {
		missing.push("email");
	}

	return missing;
}

/**
 * Checks if a user profile is complete with all required fields
 */
export function isProfileComplete(user: null | UserInfo): boolean {
	if (!user) {
		return false;
	}

	// Check required fields for a complete profile
	const hasDisplayName = user.displayName && user.displayName.trim().length >= 2;
	const hasEmail = user.email && user.email.trim().length > 0;

	return Boolean(hasDisplayName && hasEmail);
}
