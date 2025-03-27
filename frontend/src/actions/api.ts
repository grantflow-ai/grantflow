"use server";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { API } from "@/types/api-types";
import { getClient } from "@/utils/api-client";
import { getEnv } from "@/utils/env";
import { HTTPError } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Asynchronously creates authentication headers for API requests.
 *
 * This function retrieves the session cookie using a cookie store and generates
 * an Authorization header with the Bearer token if the cookie value is present.
 * If the session cookie is not available or lacks a value, the user is redirected
 * to the sign-in page.
 *
 * @returnsA promise that resolves to an object containing
 * the Authorization header with the Bearer token.
 * @throws Redirects to the sign-in page if the session cookie is invalid
 * or missing.
 */
const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);
	if (!cookie?.value) {
		redirect(PagePath.SIGNIN);
	}
	return { Authorization: `Bearer ${cookie.value}` };
};

/**
 * Executes a given promise and handles authentication-related errors.
 *
 * This function wraps a promise and checks if the error thrown by the promise
 * is an HTTP error with a 401 (Unauthorized) status code. If such an error occurs,
 * it redirects the user to the sign-in page. The original error is then rethrown
 * for further handling.
 *
 * @template T
 * @param {Promise<T>} promise - The promise to execute.
 * @returns {Promise<T>} A promise that resolves with the result of the provided promise
 * or redirects the user if an authentication error occurs.
 * @throws {Error} Rethrows the original error if not related to authentication.
 */
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
 * Creates a new application within the specified workspace using the provided form data.
 *
 * @param workspaceId - The ID of the workspace where the application will be created.
 * @param data - The form data to be submitted for the creation of the application.
 * @return A promise that resolves to the ID of the newly created application.
 */
export async function createApplication(workspaceId: string, data: API.CreateApplication.RequestBody) {
	const body = new FormData();
	for (const [key, value] of Object.entries(data)) {
		body.append(key, value);
	}

	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications`, { body, headers: await createAuthHeaders() })
			.json<API.CreateApplication.Http201.ResponseBody>(),
	);
}

/**
 * Creates a new workspace by sending a POST request with the specified data.
 *
 * @param {API.CreateWorkspace.RequestBody} data - The request body containing the necessary information to create a workspace.
 * @return A promise that resolves to the response containing the ID of the created workspace.
 */
export async function createWorkspace(data: API.CreateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("workspaces", { headers: await createAuthHeaders(), json: data })
			.json<API.CreateWorkspace.Http201.ResponseBody>(),
	);
}

/**
 * Deletes an application associated with a specific workspace.
 * This method sends a DELETE request to remove the application identified by the given applicationId
 * within the workspace identified by the given workspaceId.
 *
 * @param workspaceId - The unique identifier of the workspace containing the application to delete.
 * @param applicationId - The unique identifier of the application to delete.
 * @returnA promise that resolves when the application is successfully deleted.
 */
export async function deleteApplication(workspaceId: string, applicationId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 * Deletes a specific file associated with an application within a workspace.
 *
 * @param workspaceId - The unique identifier for the workspace containing the application.
 * @param applicationId - The unique identifier for the application containing the file.
 * @param fileId - The unique identifier for the file to be deleted.
 * @returnA promise that resolves when the file has been successfully deleted.
 */
export async function deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 * Deletes a workspace with the specified workspace ID.
 *
 * @param workspaceId - The unique identifier of the workspace to be deleted.
 * @returnA promise that resolves when the workspace is successfully deleted.
 */
export async function deleteWorkspace(workspaceId: string) {
	await withAuthRedirect(getClient().delete(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() }));
}

/**
 * Retrieves the details of a specific application within a workspace.
 *
 * @param workspaceId - The unique identifier of the workspace.
 * @param applicationId - The unique identifier of the application.
 * @return A promise that resolves to the application data.
 */
export async function getApplication(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, { headers: await createAuthHeaders() })
			.json<API.GetApplication.Http200.ResponseBody>(),
	);
}

/**
 * Fetches application files for a specific application within a workspace.
 *
 * @param workspaceId - The unique identifier of the workspace.
 * @param applicationId - The unique identifier of the application.
 * @return A promise resolving to an array of application files.
 */
export async function getApplicationFiles(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListApplicationFiles.Http200.ResponseBody[]>(),
	);
}

/**
 * Retrieves the application text content for a given workspace and application ID.
 *
 * @param workspaceId - The unique identifier of the workspace.
 * @param applicationId - The unique identifier of the application within the workspace.
 * @return A promise resolving to the application draft response containing the application text content.
 */
export async function getApplicationText(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/content`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetApplicationContent.Http200.ResponseBody>(),
	);
}

/**
 * Retrieves a one-time password (OTP) by making an authenticated API request.
 *
 * @return A promise that resolves to an object containing the OTP response.
 */
export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<API.GenerateOtp.Http200.ResponseBody>(),
	);
}

/**
 * Retrieves the workspace data for the given workspace ID.
 *
 * @param workspaceId - The unique identifier of the workspace to retrieve.
 * @return  A promise that resolves to the workspace object.
 */
export async function getWorkspace(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() })
			.json<API.GetWorkspace.Http200.ResponseBody>(),
	);
}

/**
 * Fetches the list of workspaces associated with the authenticated user.
 *
 * @return A promise that resolves to an array of workspace data.
 */
export async function getWorkspaces() {
	return withAuthRedirect(
		getClient()
			.get("workspaces", { headers: await createAuthHeaders() })
			.json<API.ListWorkspaces.Http200.ResponseBody>(),
	);
}

/**
 * Authenticates a user using the provided ID token and sets a session cookie upon successful login.
 *
 * @param idToken - The ID token retrieved from the authentication provider to validate the user.
 * @returnA promise that resolves once the login process is complete and the session cookie is set.
 */
export async function login(idToken: string) {
	const loginUrl = new URL("/login", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
	const requestBody: API.Login.RequestBody = { id_token: idToken };

	const { jwt_token } = await getClient()
		.post(loginUrl, { json: requestBody })
		.json<API.Login.Http201.ResponseBody>();

	const cookieStore = await cookies();
	cookieStore.set({
		httpOnly: true,
		maxAge: 60 * 60 * 24 * 7,
		name: SESSION_COOKIE,
		sameSite: "strict",
		secure: getEnv().NEXT_PUBLIC_SITE_URL.startsWith("https"),
		value: jwt_token,
	});

	redirect(PagePath.WORKSPACES);
}

/**
 * Updates an application within a specific workspace.
 *
 * @param workspaceId - The unique identifier of the workspace where the application resides.
 * @param applicationId - The unique identifier of the application to update.
 * @param {API.UpdateApplication.RequestBody} data - The request body containing the updated application details.
 * @return A promise that resolves with the updated application details.
 */
export async function updateApplication(
	workspaceId: string,
	applicationId: string,
	data: API.UpdateApplication.RequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<API.UpdateApplication.Http200.ResponseBody>(),
	);
}

/**
 * Updates the workspace details for the given workspace ID.
 *
 * This method sends a PATCH request to update the workspace using the provided data.
 * Authentication headers are included in the request.
 *
 * @param workspaceId - The unique identifier of the workspace to be updated.
 * @param data - The new data to update the workspace with.
 * @return A promise that resolves to the response containing the updated workspace details.
 */
export async function updateWorkspace(workspaceId: string, data: API.UpdateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}`, { headers: await createAuthHeaders(), json: data })
			.json<API.UpdateWorkspace.Http200.ResponseBody>(),
	);
}

/**
 * Uploads files related to an application within a specific workspace.
 *
 * @param workspaceId - The unique identifier of the workspace.
 * @param applicationId - The unique identifier of the application.
 * @param {FormData} formData - The form data containing the files to be uploaded.
 * @return A promise resolving to an array of uploaded application files.
 */
export async function uploadApplicationFiles(workspaceId: string, applicationId: string, formData: FormData) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				body: formData,
				headers: await createAuthHeaders(),
			})
			.json<API.UploadApplicationFiles.Http201.ResponseBody[]>(),
	);
}
