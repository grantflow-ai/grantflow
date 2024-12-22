import { UserRole } from "@/constants";

export interface APIError {
	details: string;
	message: string;
}

export interface Application extends ApplicationBase {
	files: ApplicationFile[];
	innovation: null | string;
	research_aims: ResearchAim[];
	significance: null | string;
}

export interface ApplicationBase extends ApplicationId {
	cfp: GrantCfp;
	text: null | string;
	title: string;
}

export type ApplicationDraftResponse =
	| {
			id: string;
			status: "complete";
			text: string;
	  }
	| {
			id: string;
			status: "generating";
	  };

export interface ApplicationFile {
	id: string;
	name: string;
	size: number;
	type: string;
}

export interface ApplicationId {
	id: string;
}

export interface CreateApplicationRequestBody {
	cfp_id: string;
	innovation: null | string;
	research_aims: CreateResearchAimRequestBody[];
	significance: null | string;
	title: string;
}

export interface CreateResearchAimRequestBody {
	aim_number: number;
	description: null | string;
	preliminary_results: null | string;
	requires_clinical_trials: boolean;
	research_tasks: CreateResearchTaskRequestBody[];
	risks_and_alternatives: null | string;
	title: string;
}

export interface CreateResearchTaskRequestBody {
	description: null | string;
	task_number: number;
	title: string;
}

export interface CreateWorkspaceRequestBody {
	description?: null | string;
	logo_url?: null | string;
	name: string;
}

export interface GrantCfp {
	allow_clinical_trials: boolean;
	allow_resubmissions: boolean;
	category: null | string;
	code: string;
	description: null | string;
	funding_organization_id: string;
	funding_organization_name: string;
	id: string;
	title: string;
	url: null | string;
}

export interface LoginRequestBody {
	id_token: string;
}

export interface LoginResponse {
	jwt_token: string;
}

export interface OTPResponse {
	otp: string;
}

export interface ResearchAim {
	aim_number: number;
	description: null | string;
	id: string;
	preliminary_results: null | string;
	requires_clinical_trials: boolean;
	research_tasks: ResearchTask[];
	risks_and_alternatives: null | string;
	title: string;
}

export interface ResearchTask {
	description: null | string;
	id: string;
	task_number: number;
	title: string;
}

export interface UpdateApplicationRequestBody {
	cfp_id?: string;
	innovation?: null | string;
	research_aims?: CreateResearchAimRequestBody[];
	significance?: null | string;
	title?: string;
}

export interface UpdateResearchAimRequestBody {
	aim_number?: number;
	description?: null | string;
	preliminary_results?: null | string;
	requires_clinical_trials?: boolean;
	risks_and_alternatives?: null | string;
	title?: string;
}

export interface UpdateResearchTaskRequestBody {
	description?: null | string;
	task_number?: number;
	title?: string;
}

export interface UpdateWorkspaceRequestBody {
	description?: null | string;
	logo_url?: null | string;
	name?: string;
}

export interface Workspace extends WorkspaceBase {
	applications: ApplicationBase[];
}

export interface WorkspaceBase extends WorkspaceId {
	description: null | string;
	logo_url: null | string;
	name: string;
	role: UserRole;
}

export interface WorkspaceId {
	id: string;
}
