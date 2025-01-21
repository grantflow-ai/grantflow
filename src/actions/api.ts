"use server";

import { SESSION_COOKIE } from "@/constants";
import { PagePath } from "@/enums";
import {
	ApplicationDraftResponse,
	CreateOrganizationRequestBody,
	CreateWorkspaceRequestBody,
	FundingOrganization,
	GrantApplication,
	GrantApplicationFile,
	LoginRequestBody,
	LoginResponse,
	OrganizationFile,
	OTPResponse,
	TableIdResponse,
	UpdateApplicationRequestBody,
	UpdateOrganizationRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
	WorkspaceBaseResponse,
} from "@/types/api-types";
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

// Application endpoints
/**
 *
 */
export async function createApplication(workspaceId: string, data: FormData) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications`, { body: data, headers: await createAuthHeaders() })
			.json<TableIdResponse>(),
	);
}

// Organization endpoints
/**
 *
 */
export async function createOrganization(data: CreateOrganizationRequestBody) {
	return withAuthRedirect(
		getClient()
			.post("organizations", { headers: await createAuthHeaders(), json: data })
			.json<TableIdResponse>(),
	);
}

// Workspace endpoints
/**
 *
 */
export async function createWorkspace(data: CreateWorkspaceRequestBody) {
	return withAuthRedirect(
		getClient()
			.post("workspaces", { headers: await createAuthHeaders(), json: data })
			.json<TableIdResponse>(),
	);
}

/**
 *
 */
export async function deleteApplication(workspaceId: string, applicationId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 *
 */
export async function deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string) {
	await withAuthRedirect(
		getClient().delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await createAuthHeaders(),
		}),
	);
}

/**
 *
 */
export async function deleteOrganization(organizationId: string) {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}`, { headers: await createAuthHeaders() }),
	);
}

/**
 *
 */
export async function deleteOrganizationFile(organizationId: string, fileId: string) {
	await withAuthRedirect(
		getClient().delete(`organizations/${organizationId}/files/${fileId}`, { headers: await createAuthHeaders() }),
	);
}

/**
 *
 */
export async function deleteWorkspace(workspaceId: string) {
	await withAuthRedirect(getClient().delete(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() }));
}

/**
 *
 */
export async function getApplication(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, { headers: await createAuthHeaders() })
			.json<GrantApplication>(),
	);
}

/**
 *
 */
export async function getApplicationFiles(workspaceId: string, applicationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				headers: await createAuthHeaders(),
			})
			.json<GrantApplicationFile[]>(),
	);
}

/**
 *
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

/**
 *
 */
export async function getOrganizationFiles(organizationId: string) {
	return withAuthRedirect(
		getClient()
			.get(`organizations/${organizationId}/files`, { headers: await createAuthHeaders() })
			.json<OrganizationFile[]>(),
	);
}

/**
 *
 */
export async function getOrganizations() {
	return withAuthRedirect(
		getClient()
			.get("organizations", { headers: await createAuthHeaders() })
			.json<FundingOrganization[]>(),
	);
}

/**
 *
 */
export async function getOtp() {
	return withAuthRedirect(
		getClient()
			.get("otp", { headers: await createAuthHeaders() })
			.json<OTPResponse>(),
	);
}

/**
 *
 */
export async function getWorkspace(workspaceId: string) {
	return withAuthRedirect(
		getClient()
			.get(`workspaces/${workspaceId}`, { headers: await createAuthHeaders() })
			.json<Workspace>(),
	);
}

/**
 *
 */
export async function getWorkspaces() {
	return withAuthRedirect(
		getClient()
			.get("workspaces", { headers: await createAuthHeaders() })
			.json<WorkspaceBaseResponse[]>(),
	);
}

// Auth endpoints
/**
 *
 */
export async function login(idToken: string) {
	const loginUrl = new URL("/login", getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL);
	const requestBody: LoginRequestBody = { id_token: idToken };

	const { jwt_token } = await getClient().post(loginUrl, { json: requestBody }).json<LoginResponse>();

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
 *
 */
export async function updateApplication(
	workspaceId: string,
	applicationId: string,
	data: UpdateApplicationRequestBody,
) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, {
				headers: await createAuthHeaders(),
				json: data,
			})
			.json<GrantApplication>(),
	);
}

/**
 *
 */
export async function updateOrganization(organizationId: string, data: UpdateOrganizationRequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`organizations/${organizationId}`, { headers: await createAuthHeaders(), json: data })
			.json<FundingOrganization>(),
	);
}

/**
 *
 */
export async function updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequestBody) {
	return withAuthRedirect(
		getClient()
			.patch(`workspaces/${workspaceId}`, { headers: await createAuthHeaders(), json: data })
			.json<WorkspaceBaseResponse>(),
	);
}

// Application files
/**
 *
 */
export async function uploadApplicationFiles(workspaceId: string, applicationId: string, formData: FormData) {
	return withAuthRedirect(
		getClient()
			.post(`workspaces/${workspaceId}/applications/${applicationId}/files`, {
				body: formData,
				headers: await createAuthHeaders(),
			})
			.json<GrantApplicationFile[]>(),
	);
}

// Organization files
/**
 *
 */
export async function uploadOrganizationFiles(organizationId: string, formData: FormData) {
	return withAuthRedirect(
		getClient()
			.post(`organizations/${organizationId}/files`, { body: formData, headers: await createAuthHeaders() })
			.json<OrganizationFile[]>(),
	);
}
