import { UserRole } from "@/types/user";

export function generateBackgroundColor(userId: string): string {
	const colors = [
		"#369e94",
		"#9e366f",
		"#9747ff",
		"#ff7747",
		"#47a3ff",
		"#47ff75",
		"#ff4776",
		"#7647ff",
		"#ffad47",
		"#47ffc7",
	];

	// Create a simple hash from userId to pick a consistent color
	let hash = 0;
	for (let i = 0; i < userId.length; i++) {
		hash = (userId.codePointAt(i) ?? 0) + ((hash << 5) - hash);
	}

	return colors[Math.abs(hash) % colors.length];
}

export function generateInitials(fullName?: string, email?: string): string {
	if (fullName) {
		const parts = fullName.trim().split(" ");
		if (parts.length >= 2) {
			const lastPart = parts.at(-1);
			return `${parts[0][0]}${lastPart?.[0] ?? ""}`.toUpperCase();
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
