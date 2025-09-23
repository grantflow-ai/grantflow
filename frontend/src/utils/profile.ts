import type { UserInfo } from "@/types/user";

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

export function isProfileComplete(user: null | UserInfo): boolean {
	if (!user) {
		return false;
	}

	const hasDisplayName = user.displayName && user.displayName.trim().length >= 2;
	const hasEmail = user.email && user.email.trim().length > 0;

	return Boolean(hasDisplayName && hasEmail);
}
