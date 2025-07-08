import { applicationHandlers, clearApplicationStore } from "./applications";
import { authHandlers } from "./auth";
import { fileHandlers } from "./files";
import { healthHandlers } from "./health";
import { invitationHandlers } from "./invitations";
import { clearNotifications, notificationHandlers } from "./notifications";
import { organizationHandlers } from "./organizations";
import { clearProjectMembers, projectMemberHandlers } from "./project-members";
import { clearProjectStore, projectHandlers } from "./projects";
import { ragHandlers } from "./rag";
import { sourceHandlers } from "./sources";
import { clearSoleOwnedProjects, userHandlers } from "./user";

export const mockHandlers = {
	applications: applicationHandlers,
	auth: authHandlers,
	files: fileHandlers,
	health: healthHandlers,
	invitations: invitationHandlers,
	notifications: notificationHandlers,
	organizations: organizationHandlers,
	projectMembers: projectMemberHandlers,
	projects: projectHandlers,
	rag: ragHandlers,
	sources: sourceHandlers,
	user: userHandlers,
};

export function clearAllMockStores(): void {
	clearApplicationStore();
	clearProjectStore();
	clearNotifications();
	clearProjectMembers();
	clearSoleOwnedProjects();
}
