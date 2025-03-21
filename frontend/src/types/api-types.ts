export enum FileIndexingStatus {
	FAILED = "FAILED",
	FINISHED = "FINISHED",
	INDEXING = "INDEXING",
}

export enum UserRole {
	ADMIN = "ADMIN",
	MEMBER = "MEMBER",
	OWNER = "OWNER",
}

export interface APIError {
	details?: string;
	message: string;
}

export interface ApplicationDetailsForm {
	background_context?: string;
	hypothesis?: string;
	impact?: string;
	milestones_and_timeline?: string;
	novelty_and_innovation?: string;
	preliminary_data?: string;
	rationale?: string;
	research_feasibility?: string;
	risks_and_mitigations?: string;
	scientific_infrastructure?: string;
	team_excellence?: string;
}

export interface ApplicationDraftCompleteResponse {
	id: string;
	status: "complete";
	text: string;
}

export interface ApplicationDraftProcessingResponse {
	id: string;
	status: "generating";
}

export type ApplicationDraftResponse = ApplicationDraftCompleteResponse | ApplicationDraftProcessingResponse;

export interface CreateApplicationRequestBody {
	cfp_url?: string;
	title: string;
}

export interface CreateOrganizationRequestBody {
	abbreviation?: null | string;
	full_name: string;
}

export interface CreateWorkspaceRequestBody {
	description?: null | string;
	logo_url?: null | string;
	name: string;
}
export interface GrantApplication extends TableIdResponse {
	completed_at: null | string;
	details: ApplicationDetailsForm | null;
	grant_template: GrantTemplate | null;
	research_objectives: null | ResearchObjective[];
	text: null | string;
	title: string;
	workspace_id: string;
}

export interface GrantApplicationFile {
	grant_application_id: string;
	rag_file: RagFileResponse;
}

export interface GrantSection {
	depends_on: string[];
	instructions: string;
	keywords: string[];
	max_words: number;
	min_words: number;
	name: string;
	title: string;
	topics: string[];
}

export interface GrantTemplate extends TableIdResponse {
	funding_organization: {
		abbreviation: null | string;
		full_name: string;
		id: string;
	} | null;
	grant_sections: GrantSection[];
	name: string;
	template: string;
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

export interface RagFileResponse extends TableIdResponse {
	filename: string;
	indexing_status: FileIndexingStatus;
	mime_type: string;
	size: number;
}

export interface ResearchObjective {
	description?: string;
	number: number;
	research_tasks: ResearchTask[];
	title: string;
}

export interface ResearchTask {
	description?: string;
	number: number;
	title: string;
}

export interface TableIdResponse {
	id: string;
}

export interface UpdateApplicationRequestBody {
	research_objectives?: ResearchObjective[];
	title?: string;
}

export interface UpdateWorkspaceRequestBody {
	description?: null | string;
	logo_url?: null | string;
	name?: string;
}

export interface Workspace extends WorkspaceBaseResponse {
	grant_applications: GrantApplication[];
}

export interface WorkspaceBaseResponse extends TableIdResponse {
	description: null | string;
	logo_url: null | string;
	name: string;
	role: UserRole;
}
