import ky, { KyInstance } from "ky";
import {
	ApplicationDraft,
	CreateGrantApplicationRequestBody,
	CreateResearchAimRequestBody,
	CreateWorkspaceRequestBody,
	GrantApplication,
	GrantCfp,
	ResearchAim,
	ResearchTask,
	UpdateResearchAimRequestBody,
	UpdateResearchTaskRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
} from "@/types/api-types";

export class ApiClient {
	private readonly client: KyInstance;

	constructor(firebaseIdToken: string) {
		this.client = ky.create({
			prefixUrl: process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL,
			headers: {
				Authorization: `Bearer ${firebaseIdToken}`,
			},
		});
	}

	async getCfps() {
		return this.client.get("cfps").json<GrantCfp[]>();
	}

	async createWorkspace(data: CreateWorkspaceRequestBody) {
		return this.client.post("workspaces", { json: data }).json<Workspace>();
	}

	async getWorkspaces() {
		return this.client.get("workspaces").json<Workspace[]>();
	}

	async updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequestBody) {
		return this.client.patch(`workspaces/${workspaceId}`, { json: data }).json<Workspace>();
	}

	async deleteWorkspace(workspaceId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}`);
	}

	async createApplication(workspaceId: string, data: CreateGrantApplicationRequestBody) {
		return this.client.post(`workspaces/${workspaceId}/applications`, { json: data }).json<GrantApplication>();
	}

	async getApplications(workspaceId: string) {
		return this.client.get(`workspaces/${workspaceId}/applications`).json<GrantApplication[]>();
	}

	async createResearchAims(workspaceId: string, applicationId: string, data: CreateResearchAimRequestBody[]) {
		return this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`, { json: data })
			.json<ResearchAim[]>();
	}

	async getResearchAims(workspaceId: string, applicationId: string) {
		return this.client
			.get(`workspaces/${workspaceId}/applications/${applicationId}/research-aims`)
			.json<ResearchAim[]>();
	}

	async updateResearchAim(workspaceId: string, researchAimId: string, data: UpdateResearchAimRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/research-aims/${researchAimId}`, { json: data })
			.json<Omit<ResearchAim, "research_tasks">>();
	}

	async updateResearchTask(workspaceId: string, researchTaskId: string, data: UpdateResearchTaskRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`, { json: data })
			.json<ResearchTask>();
	}

	async deleteResearchAim(workspaceId: string, researchAimId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/research-aims/${researchAimId}`);
	}

	async uploadApplicationFiles(workspaceId: string, applicationId: string, files: FormData): Promise<void> {
		await this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/index-files`, { body: files })
			.json();
	}

	async generateApplicationDraft(workspaceId: string, applicationId: string) {
		return this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/generate-draft`)
			.json<ApplicationDraft>();
	}
}
