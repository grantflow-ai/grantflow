export enum FileIndexingStatusEnum {
	FAILED = "FAILED",
	FINISHED = "FINISHED",
	INDEXING = "INDEXING",
}

export enum UserRoleEnum {
	ADMIN = "ADMIN",
	MEMBER = "MEMBER",
	OWNER = "OWNER",
}

export interface APIError {
	details?: string;
	message: string;
}

export interface ApplicationDetails {
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

// Workspace Types
export interface CreateWorkspaceRequestBody {
	description?: null | string;
	logo_url?: null | string;
	name: string;
}

// Organization Types
export interface FundingOrganization extends TableIdResponse {
	abbreviation: null | string;
	full_name: string;
}

export interface FundingOrganizationBase extends TableIdResponse {
	abbreviation: null | string;
	full_name: string;
}

export interface GrantApplication extends TableIdResponse {
	completed_at: null | string;
	details: ApplicationDetails | null;
	grant_template: GrantTemplate | null;
	research_objectives: null | ResearchObjective[];
	text_generation_results: null | TextGenerationResult[];
	title: string;
	workspace_id: string;
}

export interface GrantApplicationFile {
	grant_application_id: string;
	rag_file: RagFileResponse;
}

export interface GrantTemplate extends TableIdResponse {
	funding_organization: FundingOrganizationBase | null;
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

export interface OrganizationFile {
	funding_organization_id: string;
	rag_file: RagFileResponse;
}

// Auth Types
export interface OTPResponse {
	otp: string;
}

// File Types
export interface RagFileResponse extends TableIdResponse {
	filename: string;
	indexing_status: FileIndexingStatusEnum;
	mime_type: string;
	size: number;
}

export interface ResearchObjective {
	description?: string;
	number: number;
	relationships?: string[];
	research_tasks: ResearchTask[];
	title: string;
}

// Application Types
export interface ResearchTask {
	description?: string;
	number: number;
	relationships?: string[];
	title: string;
}

export interface TableIdResponse {
	id: string;
}

export interface TextGenerationResult {
	content: string;
	type: string;
}

export interface UpdateApplicationRequestBody {
	research_objectives?: ResearchObjective[];
	title?: string;
}

export interface UpdateOrganizationRequestBody {
	abbreviation?: null | string;
	full_name?: string;
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
	role: UserRoleEnum;
}
