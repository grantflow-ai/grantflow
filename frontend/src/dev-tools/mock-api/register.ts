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

	// File endpoints (kept for compatibility - non-source endpoints)
	client.register("/projects/:project_id/applications/:application_id/rag-files", mockHandlers.files.uploadFile);

	// RAG endpoints (kept for compatibility - non-source endpoints)
	client.register("/rag-jobs/:job_id", mockHandlers.rag.getRagJob);
	client.register("/projects/:project_id/grant-templates/:template_id", mockHandlers.rag.updateGrantTemplate);

	// Source endpoints - Template
	client.register(
		"/projects/:project_id/grant_templates/:template_id/sources/upload-url",
		mockHandlers.sources.createTemplateSourceUploadUrl,
		"POST",
	);
	client.register(
		"/projects/:project_id/grant_templates/:template_id/sources/crawl-url",
		mockHandlers.sources.crawlTemplateUrl,
		"POST",
	);
	client.register(
		"/projects/:project_id/grant_templates/:template_id/sources/:source_id",
		mockHandlers.sources.deleteTemplateSource,
		"DELETE",
	);

	// Source endpoints - Application
	client.register(
		"/projects/:project_id/applications/:application_id/sources/upload-url",
		mockHandlers.sources.createApplicationSourceUploadUrl,
		"POST",
	);
	client.register(
		"/projects/:project_id/applications/:application_id/sources/crawl-url",
		mockHandlers.sources.crawlApplicationUrl,
		"POST",
	);
	client.register(
		"/projects/:project_id/applications/:application_id/sources/:source_id",
		mockHandlers.sources.deleteApplicationSource,
		"DELETE",
	);

	console.log("[Mock API] All handlers registered");
}
