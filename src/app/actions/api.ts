"use server";

import { getEnv } from "@/utils/env";
import {
	ApplicationDraft,
	ApplicationFile,
	CreateGrantApplicationRequestBody,
	CreateResearchAimRequestBody,
	CreateWorkspaceRequestBody,
	GrantApplication,
	GrantApplicationDetail,
	GrantCfp,
	LoginRequestBody,
	LoginResponse,
	OTPResponse,
	ResearchAim,
	ResearchTask,
	UpdateApplicationRequestBody,
	UpdateResearchAimRequestBody,
	UpdateResearchTaskRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
} from "@/types/api-types";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/constants";
import { getClient } from "@/utils/api-client";
import { redirect } from "next/navigation";
import { PagePath } from "@/enums";
import { HTTPError } from "ky";

const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);
	if (!cookie?.value) {
		redirect(PagePath.SIGNIN);
	}
	return { Authorization: `Bearer ${cookie.value}` };
};

/**
 * 	Handle the login process.
 *
 * 	1. Send the ID token to the backend.
 * 	2. Receive a signed JWT token.
 * 	3. Set the JWT token in a secure, HTTP-only cookie.
 *
 * 	@param idToken - The ID token.
 */
export async function login(idToken: string) {
	const loginUrl = new URL("/login", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
	const requestBody = { id_token: idToken } satisfies LoginRequestBody;

	console.log(`sending loging request to ${loginUrl} with ${JSON.stringify(requestBody)}`);
	const { jwt_token } = await getClient().post(loginUrl, { json: requestBody }).json<LoginResponse>();

	const cookieStore = await cookies();

	cookieStore.set({
		value: jwt_token,
		name: SESSION_COOKIE,
		secure: getEnv().NEXT_PUBLIC_SITE_URL.startsWith("https"),
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7,
		sameSite: "strict",
	});

	redirect(PagePath.WORKSPACES);
}

const withAuthRedirect = async <T>(promise: Promise<T>): Promise<T> => {
	try {
		return await promise;
	} catch (error) {
		if (error instanceof HTTPError && error.response.status === 401) {
			redirect(PagePath.SIGNIN);
		}
		throw error;
	}
};

/**
 * Get a one-time password (OTP) for websocket authentication.
 * @returns Promise containing the OTP response
 */
export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<OTPResponse>(),
	);
}

/**
 * Retrieve all available Call for Proposals (CFPs).
 * @returns Promise containing an array of grant CFPs
 */
export async function getCfps() {
	return withAuthRedirect(
		getClient()
			.get("cfps", { headers: await createAuthHeaders() })
			.json<GrantCfp[]>(),
	);
}

/**
 * Create a new workspace.
 * @param data - The workspace creation request data
 * @returns Promise containing the created workspace
 */
export async function createWorkspace(data: CreateWorkspaceRequestBody) {
	return withAuthRedirect(
		getClient()
			.post("workspaces", { json: data, headers: await createAuthHeaders() })
			.json<Workspace>(),
	);
}

/**
 * Retrieve all workspaces for the authenticated user.
 * @returns Promise containing an array of workspaces
 */
export async function getWorkspaces() {
	return withAuthRedirect(
		getClient()
			.get("workspaces", { headers: await createAuthHeaders() })
			.json<Workspace[]>(),
	);
}

/**
 * Retrieve a specific workspace by ID.
 * @param workspaceId - The unique identifier of the workspace
 * @returns Promise containing the workspace details
 */
export async function getWorkspace(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() })
			.json<Workspace>(),
	);
}

/**
 * Update an existing workspace.
 * @param workspaceId - The unique identifier of the workspace to update
 * @param data - The workspace update request data
 * @returns Promise containing the updated workspace
 */
export async function updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}`, { json: data, headers: await createAuthHeaders() })
			.json<Workspace>(),
	);
}

/**
 * Delete a workspace.
 * @param workspaceId - The unique identifier of the workspace to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteWorkspace(workspaceId: string): Promise<void> {
	await withAuthRedirect(getClient().delete(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() }));
}

/**
 * Create a new grant application within a workspace.
 * @param workspaceId - The unique identifier of the workspace
 * @param data - The grant application creation request data
 * @returns Promise containing the created grant application
 */
export async function createApplication(workspaceId: string, data: CreateGrantApplicationRequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications`, { json: data, headers: await createAuthHeaders() })
			.json<GrantApplication>(),
	);
}

/**
 * Update an existing grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @param data - The application update request data
 * @returns Promise containing the updated grant application
 */
export async function updateApplication(
	workspaceId: string,
	applicationId: string,
	data: UpdateApplicationRequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, {
				json: data,
				headers: await createAuthHeaders(),
			})
			.json<GrantApplication>(),
	);
}

/**
 * Retrieve all applications within a workspace.
 * @param workspaceId - The unique identifier of the workspace
 * @returns Promise containing an array of grant applications
 */
export async function getApplications(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications`, { headers: await createAuthHeaders() })
			.json<GrantApplication[]>(),
	);
}

/**
 * Retrieve detailed information about a specific application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @returns Promise containing detailed grant application information
 */
export async function getApplicationDetail(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, { headers: await createAuthHeaders() })
			.json<GrantApplicationDetail>(),
	);
}

/**
 * Create research aims for a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @param data - Array of research aim creation request data
 * @returns Promise containing an array of created research aims
 */
export async function createResearchAims(
	workspaceId: string,
	applicationId: string,
	data: CreateResearchAimRequestBody[],
) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`, {
				json: data,
				headers: await createAuthHeaders(),
			})
			.json<ResearchAim[]>(),
	);
}

/**
 * Retrieve all research aims for a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @returns Promise containing an array of research aims
 */
export async function getResearchAims(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`, {
				headers: await createAuthHeaders(),
			})
			.json<ResearchAim[]>(),
	);
}

/**
 * Update an existing research aim.
 * @param workspaceId - The unique identifier of the workspace
 * @param researchAimId - The unique identifier of the research aim
 * @param data - The research aim update request data
 * @returns Promise containing the updated research aim (excluding research tasks)
 */
export async function updateResearchAim(
	workspaceId: string,
	researchAimId: string,
	data: UpdateResearchAimRequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/research-aims/${researchAimId}`, {
				json: data,
				headers: await createAuthHeaders(),
			})
			.json<Omit<ResearchAim, "research_tasks">>(),
	);
}

/**
 * Update an existing research task.
 * @param workspaceId - The unique identifier of the workspace
 * @param researchTaskId - The unique identifier of the research task
 * @param data - The research task update request data
 * @returns Promise containing the updated research task
 */
export async function updateResearchTask(
	workspaceId: string,
	researchTaskId: string,
	data: UpdateResearchTaskRequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`, {
				json: data,
				headers: await createAuthHeaders(),
			})
			.json<ResearchTask>(),
	);
}

/**
 * Delete a research aim.
 * @param workspaceId - The unique identifier of the workspace
 * @param researchAimId - The unique identifier of the research aim to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteResearchAim(workspaceId: string, researchAimId: string): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/research-aims/${researchAimId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 * Delete a research task.
 * @param workspaceId - The unique identifier of the workspace
 * @param researchTaskId - The unique identifier of the research task to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteResearchTask(workspaceId: string, researchTaskId: string): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 * Upload files for a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @param files - Array of files to upload
 * @returns Promise containing an array of uploaded application files
 */
export async function uploadApplicationFiles(workspaceId: string, applicationId: string, files: File[]) {
	const formData = new FormData();
	for (const file of files) {
		formData.append(file.name, file);
	}
	return await withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/index-files`, {
				body: formData,
				headers: await createAuthHeaders(),
			})
			.json<ApplicationFile[]>(),
	);
}

/**
 * Delete a file from a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @param fileId - The unique identifier of the file to delete
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string): Promise<void> {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 * Generate a draft for a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @returns Promise containing the generated application draft
 */
export async function generateApplicationDraft(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/generate-draft`, {
				headers: await createAuthHeaders(),
			})
			.json<ApplicationDraft>(),
	);
}
