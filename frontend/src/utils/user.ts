import { UserRole } from "@/types/user";

export function generateInitials(fullName?: string, email?: string): string {
	if (fullName) {
		const parts = fullName.trim().split(" ");
		if (parts.length >= 2) {
			return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
		}
		if (parts.length === 1) {
			return parts[0].slice(0, 2).toUpperCase();
		}
	}

	if (email) {
		return email.slice(0, 2).toUpperCase();
	}

	return "??";
}

export function getRoleLabel(role: UserRole): string {
	switch (role) {
		case UserRole.ADMIN: {
			return "Admin";
		}
		case UserRole.MEMBER: {
			return "Collaborator";
		}
		case UserRole.OWNER: {
			return "Owner";
		}
		default: {
			return "Collaborator";
		}
	}
}
