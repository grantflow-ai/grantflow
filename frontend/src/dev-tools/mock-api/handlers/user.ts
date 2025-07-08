import type { API } from "@/types/api-types";
import { log } from "@/utils/logger";

const soleOwnedProjects: API.GetSoleOwnedProjects.Http200.ResponseBody["projects"] = [];

export const userHandlers = {
	deleteUser: async (): Promise<API.DeleteUser.Http200.ResponseBody> => {
		log.info("[Mock API] Deleting user");

		const deletionDate = new Date();
		deletionDate.setDate(deletionDate.getDate() + 10);

		return {
			grace_period_days: 10,
			message: "Account scheduled for deletion. You will be removed from all projects immediately.",
			restoration_info: "Contact support within 10 days to restore your account",
			scheduled_deletion_date: deletionDate.toISOString(),
		};
	},

	getSoleOwnedProjects: async (): Promise<API.GetSoleOwnedProjects.Http200.ResponseBody> => {
		log.info("[Mock API] Getting sole owned projects");

		return {
			count: soleOwnedProjects.length,
			projects: soleOwnedProjects,
		};
	},
};

export function addSoleOwnedProject(project: { id: string; name: string }): void {
	soleOwnedProjects.push(project);
}

export function clearSoleOwnedProjects(): void {
	soleOwnedProjects.length = 0;
}

export function removeSoleOwnedProject(projectId: string): void {
	const index = soleOwnedProjects.findIndex((p) => p.id === projectId);
	if (index !== -1) {
		soleOwnedProjects.splice(index, 1);
	}
}
