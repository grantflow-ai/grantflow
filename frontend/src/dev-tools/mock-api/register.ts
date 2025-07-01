import { getMockAPIClient } from "./client";
import { mockHandlers } from "./handlers";

export function registerMockHandlers(): void {
	const client = getMockAPIClient();

	// Auth endpoints
	client.register("/login", mockHandlers.auth.login, "POST");
	client.register("/auth/login", mockHandlers.auth.login, "POST"); // Keep for compatibility
	client.register("/otp", mockHandlers.auth.generateOtp, "GET");

	// Project endpoints
	client.register("/projects", mockHandlers.projects.listProjects, "GET");
	client.register("/projects/:project_id", mockHandlers.projects.getProject, "GET");
	client.register("/projects", mockHandlers.projects.createProject, "POST");
	client.register("/projects/:project_id", mockHandlers.projects.updateProject, "PUT");
	client.register("/projects/:project_id", mockHandlers.projects.deleteProject, "DELETE");

	// Application endpoints
	client.register("/projects/:project_id/applications", mockHandlers.applications.createApplication, "POST");
	client.register(
		"/projects/:project_id/applications/:application_id",
		mockHandlers.applications.retrieveApplication,
		"GET",
	);
	client.register(
		"/projects/:project_id/applications/:application_id",
		mockHandlers.applications.updateApplication,
		"PUT",
	);
	client.register(
		"/projects/:project_id/applications/:application_id",
		mockHandlers.applications.updateApplication,
		"PATCH",
	);
	client.register(
		"/projects/:project_id/applications/:application_id",
		mockHandlers.applications.deleteApplication,
		"DELETE",
	);
	client.register(
		"/projects/:project_id/applications/:application_id/rag-sources",
		mockHandlers.applications.getRagSources,
		"GET",
	);
	client.register(
		"/projects/:project_id/applications/:application_id/generate",
		mockHandlers.applications.generateApplication,
		"POST",
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
