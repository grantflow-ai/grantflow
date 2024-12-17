"use server";

import { getEnv } from "@/utils/env";
import {
	ApplicationDraftResponse,
	Application,
	GrantCfp,
	LoginRequestBody,
	LoginResponse,
	OTPResponse,
	UpdateApplicationRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
	WorkspaceBase,
	ApplicationId,
	ApplicationBase,
	CreateApplicationRequestBody,
	CreateWorkspaceRequestBody,
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
			.json<WorkspaceBase[]>(),
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
			.json<WorkspaceBase>(),
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
export async function createApplication(workspaceId: string, data: CreateApplicationRequestBody) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications`, { json: data, headers: await createAuthHeaders() })
			.json<ApplicationId>(),
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
			.json<ApplicationBase>(),
	);
}

/**
 * Retrieve detailed information about a specific application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @returns Promise containing detailed grant application information
 */
export async function getApplication(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, { headers: await createAuthHeaders() })
			.json<Application>(),
	);
}

/**
 * Retrieve a draft for a grant application.
 * @param workspaceId - The unique identifier of the workspace
 * @param applicationId - The unique identifier of the application
 * @returns Promise containing the application draft
 */
export async function getApplicationText(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/content`, {
				headers: await createAuthHeaders(),
			})
			.json<ApplicationDraftResponse>(),
	);
}
