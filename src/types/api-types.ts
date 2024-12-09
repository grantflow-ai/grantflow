import { UserRole } from "@/constants";

export interface APIError {
	message: string;
	details: string;
}

export interface Workspace {
	id: string;
	name: string;
	description?: string | null;
	logo_url?: string | null;
	role: UserRole;
}

export type CreateWorkspaceRequestBody = Omit<Workspace, "id" | "role">;
export type UpdateWorkspaceRequestBody = Partial<CreateWorkspaceRequestBody>;

export interface GrantApplication {
	id: string;
	title: string;
	cfp_id: string;
	significance?: string | null;
	innovation?: string | null;
}

export interface GrantApplicationDetail {
	id: string;
	title: string;
	innovation: string | null;
	significance: string | null;
	cfp: GrantCfp;
	research_aims: ResearchAim[];
	application_files: ApplicationFile[];
}

export interface ApplicationFile {
	id: string;
	name: string;
	type: string;
	size: number;
}

export type CreateGrantApplicationRequestBody = Omit<GrantApplication, "id">;
export type UpdateApplicationRequestBody = Partial<CreateGrantApplicationRequestBody>;

export interface ResearchTask {
	id: string;
	task_number: number;
	title: string;
	description?: string | null;
}

export type CreateResearchTaskRequestBody = Omit<ResearchTask, "id">;
export type UpdateResearchTaskRequestBody = Partial<CreateResearchTaskRequestBody>;

export interface ResearchAim {
	id: string;
	title: string;
	description?: string | null;
	requires_clinical_trials: boolean;
	research_tasks: ResearchTask[];
}

export type CreateResearchAimRequestBody = Omit<ResearchAim, "id"> & {
	research_tasks: CreateResearchTaskRequestBody[];
};
export type UpdateResearchAimRequestBody = Partial<Omit<ResearchAim, "id" | "research_tasks">>;

export interface GrantCfp {
	id: string;
	allow_clinical_trials: boolean;
	allow_resubmissions: boolean;
	category: string | null;
	code: string;
	description: string | null;
	title: string;
	url: string | null;
	funding_organization_id: string;
	funding_organization_name: string;
}

export interface ApplicationDraft {
	content: string;
	duration: number;
}

export interface LoginRequestBody {
	id_token: string;
}

export interface LoginResponse {
	jwt_token: string;
}
