import { getMockAPIClient } from "./client";
import { mockHandlers } from "./handlers";

export function registerMockHandlers(): void {
	const client = getMockAPIClient();

	// Auth endpoints
	client.register("/auth/login", mockHandlers.auth.login);
	client.register("/auth/otp", mockHandlers.auth.generateOtp);

	// Project endpoints
	client.register("/projects", mockHandlers.projects.listProjects);
	client.register("/projects/:project_id", mockHandlers.projects.getProject);
	client.register("/projects", mockHandlers.projects.createProject);
	client.register("/projects/:project_id", mockHandlers.projects.updateProject);
	client.register("/projects/:project_id", mockHandlers.projects.deleteProject);

	// Application endpoints
	client.register("/projects/:project_id/applications", mockHandlers.applications.createApplication);
	client.register(
		"/projects/:project_id/applications/:application_id",
		mockHandlers.applications.retrieveApplication,
	);
	client.register("/projects/:project_id/applications/:application_id", mockHandlers.applications.updateApplication);
	client.register("/projects/:project_id/applications/:application_id", mockHandlers.applications.deleteApplication);
	client.register(
		"/projects/:project_id/applications/:application_id/rag-sources",
		mockHandlers.applications.getRagSources,
	);
	client.register(
		"/projects/:project_id/applications/:application_id/generate",
		mockHandlers.applications.generateApplication,
	);

	// Organization endpoints
	client.register("/organizations", mockHandlers.organizations.createOrganization);
	client.register("/organizations/:organization_id", mockHandlers.organizations.updateOrganization);
	client.register("/funding-organizations", mockHandlers.organizations.listFundingOrganizations);

	// Invitation endpoints
	client.register("/projects/:project_id/invitations", mockHandlers.invitations.createInvitation);
	client.register("/invitations/:invitation_id/accept", mockHandlers.invitations.acceptInvitation);
	client.register("/invitations/:invitation_id/role", mockHandlers.invitations.updateInvitationRole);

	// File endpoints
	client.register("/projects/:project_id/applications/:application_id/rag-files", mockHandlers.files.uploadFile);
	client.register(
		"/projects/:project_id/applications/:application_id/rag-files/upload-url",
		mockHandlers.files.getUploadUrl,
	);
	client.register("/rag-sources/:source_id", mockHandlers.files.deleteFile);

	// RAG endpoints
	client.register("/rag-jobs/:job_id", mockHandlers.rag.getRagJob);
	client.register("/projects/:project_id/applications/:application_id/crawl", mockHandlers.rag.crawlUrl);
	client.register("/projects/:project_id/grant-templates/:template_id", mockHandlers.rag.updateGrantTemplate);

	console.log("[Mock API] All handlers registered");
}
