/**
 * Client-side API actions that can be intercepted by mock mode
 * These mirror the server actions but run on the client
 */

import type { API } from "@/types/api-types";
import { isMockAPIEnabled } from "./client";
import { getMockClient } from "./mock-client";

export async function createApplication(
	projectId: string,
	data: API.CreateApplication.RequestBody,
): Promise<API.CreateApplication.Http201.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock createApplication should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.post(`projects/${projectId}/applications`, { json: data });
	return response.json<API.CreateApplication.Http201.ResponseBody>();
}

export async function createProject(
	data: API.CreateProject.RequestBody,
): Promise<API.CreateProject.Http201.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock createProject should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.post("projects", { json: data });
	return response.json<API.CreateProject.Http201.ResponseBody>();
}

export async function deleteApplication(projectId: string, applicationId: string): Promise<void> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock deleteApplication should only be called in mock mode");
	}
	const mockClient = getMockClient();
	await mockClient.delete(`projects/${projectId}/applications/${applicationId}`);
}

export async function deleteProject(projectId: string): Promise<void> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock deleteProject should only be called in mock mode");
	}
	const mockClient = getMockClient();
	await mockClient.delete(`projects/${projectId}`);
}

export async function generateApplication(
	projectId: string,
	applicationId: string,
): Promise<API.GenerateApplication.Http201.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock generateApplication should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.post(`projects/${projectId}/applications/${applicationId}/generate`, {});
	return response.json<API.GenerateApplication.Http201.ResponseBody>();
}

export async function generateOtp(): Promise<API.GenerateOtp.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock generateOtp should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.post("auth/otp", {});
	return response.json<API.GenerateOtp.Http200.ResponseBody>();
}

export async function getApplication(
	projectId: string,
	applicationId: string,
): Promise<API.RetrieveApplication.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock getApplication should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.get(`projects/${projectId}/applications/${applicationId}`);
	return response.json<API.RetrieveApplication.Http200.ResponseBody>();
}

export async function getProject(projectId: string): Promise<API.GetProject.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock getProject should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.get(`projects/${projectId}`);
	return response.json<API.GetProject.Http200.ResponseBody>();
}

export async function getProjects(): Promise<API.ListProjects.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock getProjects should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.get("projects");
	return response.json<API.ListProjects.Http200.ResponseBody>();
}

export async function getRagSources(
	projectId: string,
	applicationId: string,
): Promise<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock getRagSources should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.get(`projects/${projectId}/applications/${applicationId}/rag-sources`);
	return response.json<API.RetrieveGrantApplicationRagSources.Http200.ResponseBody>();
}

export async function login(data: API.Login.RequestBody): Promise<API.Login.Http201.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock login should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.post("auth/login", { json: data });
	return response.json<API.Login.Http201.ResponseBody>();
}

export async function updateApplication(
	projectId: string,
	applicationId: string,
	data: API.UpdateApplication.RequestBody,
): Promise<API.UpdateApplication.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock updateApplication should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.patch(`projects/${projectId}/applications/${applicationId}`, { json: data });
	return response.json<API.UpdateApplication.Http200.ResponseBody>();
}

export async function updateProject(
	projectId: string,
	data: API.UpdateProject.RequestBody,
): Promise<API.UpdateProject.Http200.ResponseBody> {
	if (!isMockAPIEnabled()) {
		throw new Error("Mock updateProject should only be called in mock mode");
	}
	const mockClient = getMockClient();
	const response = await mockClient.patch(`projects/${projectId}`, { json: data });
	return response.json<API.UpdateProject.Http200.ResponseBody>();
}
