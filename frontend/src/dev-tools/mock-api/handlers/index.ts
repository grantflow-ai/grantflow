import { applicationHandlers, clearApplicationStore } from "./applications";
import { authHandlers } from "./auth";
import { fileHandlers } from "./files";
import { invitationHandlers } from "./invitations";
import { organizationHandlers } from "./organizations";
import { clearProjectStore, projectHandlers } from "./projects";
import { ragHandlers } from "./rag";
import { sourceHandlers } from "./sources";

export const mockHandlers = {
	applications: applicationHandlers,
	auth: authHandlers,
	files: fileHandlers,
	invitations: invitationHandlers,
	organizations: organizationHandlers,
	projects: projectHandlers,
	rag: ragHandlers,
	sources: sourceHandlers,
};

export function clearAllMockStores(): void {
	clearApplicationStore();
	clearProjectStore();
}
