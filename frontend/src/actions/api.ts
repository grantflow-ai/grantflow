"use server";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import { API } from "@/types/api-types";
import { getClient } from "@/utils/api-client";
import { getEnv } from "@/utils/env";
import { HTTPError } from "ky";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const createAuthHeaders = async () => {
	const cookieStore = await cookies();
	const cookie = cookieStore.get(SESSION_COOKIE);
	if (!cookie?.value) {
		redirect(PagePath.SIGNIN);
	}
	return { Authorization: `Bearer ${cookie.value}` };
};

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

export async function createWorkspace(data: API.CreateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.post("workspaces", { headers: await createAuthHeaders(), json: data })
			.json<API.CreateWorkspace.Http201.ResponseBody>(),
	);
}

export async function deleteApplication(workspaceId: string, applicationId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

export async function deleteWorkspace(workspaceId: string) {
	await withAuthRedirect(getClient().delete(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() }));
}

export async function getApplication(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, { headers: await createAuthHeaders() })
			.json<API.GetApplication.Http200.ResponseBody>(),
	);
}

export async function getApplicationFiles(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				headers: await createAuthHeaders(),
			})
			.json<API.ListApplicationFiles.Http200.ResponseBody[]>(),
	);
}

export async function getApplicationText(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/content`, {
				headers: await createAuthHeaders(),
			})
			.json<API.GetApplicationContent.Http200.ResponseBody>(),
	);
}

export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<API.GenerateOtp.Http200.ResponseBody>(),
	);
}

export async function getWorkspace(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() })
			.json<API.GetWorkspace.Http200.ResponseBody>(),
	);
}

export async function getWorkspaces() {
	return withAuthRedirect(
		getClient()
			.get("workspaces", { headers: await createAuthHeaders() })
			.json<API.ListWorkspaces.Http200.ResponseBody>(),
	);
}

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

export async function updateWorkspace(workspaceId: string, data: API.UpdateWorkspace.RequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}`, { headers: await createAuthHeaders(), json: data })
			.json<API.UpdateWorkspace.Http200.ResponseBody>(),
	);
}

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
