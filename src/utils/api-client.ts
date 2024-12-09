import ky, { KyInstance } from "ky";
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
	ResearchAim,
	ResearchTask,
	UpdateApplicationRequestBody,
	UpdateResearchAimRequestBody,
	UpdateResearchTaskRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
} from "@/types/api-types";
import { getEnv } from "@/utils/env";
import { Ref } from "@/utils/state";
import { getFirebaseAuth } from "@/utils/firebase";

export class ApiClient {
	private readonly client: KyInstance;
	private jwtToken: string | null;

	constructor() {
		this.jwtToken = null;
		this.client = ky.create({
			prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
		});
	}

	private async createAuthHeader() {
		if (!this.jwtToken) {
			const idToken = await getFirebaseAuth().currentUser?.getIdToken();
			if (!idToken) {
				throw new Error("User is not authenticated");
			}
			const { jwt_token } = await this.client
				.post("login", {
					json: { id_token: idToken } satisfies LoginRequestBody,
				})
				.json<LoginResponse>();

			this.jwtToken = jwt_token;
		}

		return {
			Authorization: `Bearer ${this.jwtToken}`,
		};
	}

	async getCfps() {
		return this.client
			.get("cfps", {
				headers: await this.createAuthHeader(),
			})
			.json<GrantCfp[]>();
	}

	async createWorkspace(data: CreateWorkspaceRequestBody) {
		return this.client.post("workspaces", { json: data, headers: await this.createAuthHeader() }).json<Workspace>();
	}

	async getWorkspaces() {
		return this.client
			.get("workspaces", {
				headers: await this.createAuthHeader(),
			})
			.json<Workspace[]>();
	}

	async getWorkspace(workspaceId: string) {
		return this.client
			.get(`workspaces/${workspaceId}`, {
				headers: await this.createAuthHeader(),
			})
			.json<Workspace>();
	}

	async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}`, { json: data, headers: await this.createAuthHeader() })
			.json<Workspace>();
	}

	async deleteWorkspace(workspaceId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}`, {
			headers: await this.createAuthHeader(),
		});
	}

	async createApplication(workspaceId: string, data: CreateGrantApplicationRequestBody) {
		return this.client
			.post(`workspaces/${workspaceId}/applications`, { json: data, headers: await this.createAuthHeader() })
			.json<GrantApplication>();
	}

	async updateApplication(workspaceId: string, applicationId: string, data: UpdateApplicationRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, {
				json: data,
				headers: await this.createAuthHeader(),
			})
			.json<GrantApplication>();
	}

	async getApplications(workspaceId: string) {
		return this.client
			.get(`workspaces/${workspaceId}/applications`, {
				headers: await this.createAuthHeader(),
			})
			.json<GrantApplication[]>();
	}

	async getApplicationDetail(workspaceId: string, applicationId: string) {
		return this.client
			.get(`workspaces/${workspaceId}/applications/${applicationId}`, {
				headers: await this.createAuthHeader(),
			})
			.json<GrantApplicationDetail>();
	}

	async createResearchAims(workspaceId: string, applicationId: string, data: CreateResearchAimRequestBody[]) {
		return this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`, {
				json: data,
				headers: await this.createAuthHeader(),
			})
			.json<ResearchAim[]>();
	}

	async getResearchAims(workspaceId: string, applicationId: string) {
		return this.client
			.get(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`, {
				headers: await this.createAuthHeader(),
			})
			.json<ResearchAim[]>();
	}

	async updateResearchAim(workspaceId: string, researchAimId: string, data: UpdateResearchAimRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/research-aims/${researchAimId}`, {
				json: data,
				headers: await this.createAuthHeader(),
			})
			.json<Omit<ResearchAim, "research_tasks">>();
	}

	async updateResearchTask(workspaceId: string, researchTaskId: string, data: UpdateResearchTaskRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`, {
				json: data,
				headers: await this.createAuthHeader(),
			})
			.json<ResearchTask>();
	}

	async deleteResearchAim(workspaceId: string, researchAimId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/research-aims/${researchAimId}`, {
			headers: await this.createAuthHeader(),
		});
	}

	async deleteResearchTask(workspaceId: string, researchTaskId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`, {
			headers: await this.createAuthHeader(),
		});
	}

	async uploadApplicationFiles(workspaceId: string, applicationId: string, files: File[]) {
		const formData = new FormData();
		for (const file of files) {
			formData.append("files", file);
		}
		return await this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/index-files`, {
				body: formData,
				headers: await this.createAuthHeader(),
			})
			.json<ApplicationFile[]>();
	}

	async deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`, {
			headers: await this.createAuthHeader(),
		});
	}

	async generateApplicationDraft(workspaceId: string, applicationId: string) {
		return this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/generate-draft`, {
				headers: await this.createAuthHeader(),
			})
			.json<ApplicationDraft>();
	}
}

const clientRef = new Ref<ApiClient>();

/**
 * Get the API client instance.
 *
 * @returns - The API client instance.
 */
export function getApiClient(): ApiClient {
	if (!clientRef.value) {
		clientRef.value = new ApiClient();
	}
	return clientRef.value;
}
