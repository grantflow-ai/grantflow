import { UserRole } from "@/constants";

export interface APIError {
	message: string;
	details: string;
}

export interface WorkspaceId {
	id: string;
}

export interface WorkspaceBase extends WorkspaceId {
	name: string;
	description: string | null;
	logo_url: string | null;
	role: UserRole;
}

export interface Workspace extends WorkspaceBase {
	applications: ApplicationBase[];
}

export interface CreateWorkspaceRequestBody {
	name: string;
	description?: string | null;
	logo_url?: string | null;
}

export interface UpdateWorkspaceRequestBody {
	name?: string;
	description?: string | null;
	logo_url?: string | null;
}

export interface ApplicationId {
	id: string;
}

export interface ApplicationBase extends ApplicationId {
	title: string;
	cfp: GrantCfp;
	text: string | null;
}

export interface Application extends ApplicationBase {
	significance: string | null;
	innovation: string | null;
	research_aims: ResearchAim[];
	files: ApplicationFile[];
}

export interface CreateApplicationRequestBody {
	title: string;
	cfp_id: string;
	significance: string | null;
	innovation: string | null;
	research_aims: CreateResearchAimRequestBody[];
}

export interface UpdateApplicationRequestBody {
	title?: string;
	cfp_id?: string;
	significance?: string | null;
	innovation?: string | null;
	research_aims?: CreateResearchAimRequestBody[];
}

export interface ApplicationFile {
	id: string;
	name: string;
	type: string;
	size: number;
}

export interface ResearchTask {
	id: string;
	task_number: number;
	description: string | null;
	title: string;
}

export interface CreateResearchTaskRequestBody {
	description: string | null;
	task_number: number;
	title: string;
}

export interface UpdateResearchTaskRequestBody {
	task_number?: number;
	description?: string | null;
	title?: string;
}

export interface ResearchAim {
	id: string;
	aim_number: number;
	description: string | null;
	requires_clinical_trials: boolean;
	preliminary_results: string | null;
	risks_and_alternatives: string | null;
	title: string;
	research_tasks: ResearchTask[];
}

export interface CreateResearchAimRequestBody {
	aim_number: number;
	description: string | null;
	requires_clinical_trials: boolean;
	preliminary_results: string | null;
	risks_and_alternatives: string | null;
	research_tasks: CreateResearchTaskRequestBody[];
	title: string;
}

export interface UpdateResearchAimRequestBody {
	aim_number?: number;
	description?: string | null;
	preliminary_results?: string | null;
	risks_and_alternatives?: string | null;
	requires_clinical_trials?: boolean;
	title?: string;
}

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

export type ApplicationDraftResponse =
	| {
			id: string;
			status: "generating";
	  }
	| {
			id: string;
			status: "complete";
			text: string;
	  };

export interface LoginRequestBody {
	id_token: string;
}

export interface LoginResponse {
	jwt_token: string;
}

export interface OTPResponse {
	otp: string;
}
