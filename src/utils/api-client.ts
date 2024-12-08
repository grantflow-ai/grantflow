import ky, { BeforeRequestHook, KyInstance } from "ky";
import {
	ApplicationDraft,
	ApplicationFile,
	CreateGrantApplicationRequestBody,
	CreateResearchAimRequestBody,
	CreateWorkspaceRequestBody,
	GrantApplication,
	GrantApplicationDetail,
	GrantCfp,
	ResearchAim,
	ResearchTask,
	UpdateApplicationRequestBody,
	UpdateResearchAimRequestBody,
	UpdateResearchTaskRequestBody,
	UpdateWorkspaceRequestBody,
	Workspace,
} from "@/types/api-types";
import { getEnv } from "@/utils/env";

export class ApiClient {
	private readonly client: KyInstance;

	constructor(hook: BeforeRequestHook) {
		this.client = ky.create({
			prefixUrl: getEnv().NEXT_PUBLIC_BACKEND_API_BASE_URL,
			hooks: {
				beforeRequest: [hook],
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

	async getWorkspace(workspaceId: string) {
		return this.client.get(`workspaces/${workspaceId}`).json<Workspace>();
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

	async updateApplication(workspaceId: string, applicationId: string, data: UpdateApplicationRequestBody) {
		return this.client
			.patch(`workspaces/${workspaceId}/applications/${applicationId}`, { json: data })
			.json<GrantApplication>();
	}

	async getApplications(workspaceId: string) {
		return this.client.get(`workspaces/${workspaceId}/applications`).json<GrantApplication[]>();
	}

	async getApplicationDetail(workspaceId: string, applicationId: string) {
		return this.client
			.get(`workspaces/${workspaceId}/applications/${applicationId}`)
			.json<GrantApplicationDetail>();
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

	async deleteResearchTask(workspaceId: string, researchTaskId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/research-tasks/${researchTaskId}`);
	}

	async uploadApplicationFiles(workspaceId: string, applicationId: string, files: File[]) {
		const formData = new FormData();
		for (const file of files) {
			formData.append("files", file);
		}
		return await this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/index-files`, { body: formData })
			.json<ApplicationFile[]>();
	}

	async deleteApplicationFile(workspaceId: string, applicationId: string, fileId: string): Promise<void> {
		await this.client.delete(`workspaces/${workspaceId}/applications/${applicationId}/files/${fileId}`);
	}

	async generateApplicationDraft(workspaceId: string, applicationId: string) {
		return this.client
			.post(`workspaces/${workspaceId}/applications/${applicationId}/generate-draft`)
			.json<ApplicationDraft>();
	}
}
