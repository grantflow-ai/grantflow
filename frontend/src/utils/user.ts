import { UserRole } from "@/types/user";

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
