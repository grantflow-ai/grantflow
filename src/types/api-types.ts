export interface APIError {
	message: string;
	details: string;
}

export interface ResearchTaskDTO {
	id: string;
	title: string;
	description: string;
}

export interface ResearchAimDTO {
	id: string;
	title: string;
	description: string;
	requires_clinical_trials: boolean;
	tasks: ResearchTaskDTO[];
}

export interface SignificanceAndInnovationDTO {
	significance_id: string;
	innovation_id: string;
	significance_description: string;
	innovation_description: string;
}

export interface SectionGenerationRequest {
	workspace_id: string;
	application_title: string;
	cfp_title: string;
	grant_funding_organization: string;
	data: string | SignificanceAndInnovationDTO | ResearchAimDTO[];
}

export interface InnovationAndSignificanceGenerationResponse {
	innovation_text: string;
	significance_text: string;
}

export interface ResearchPlanGenerationResponse {
	research_plan_text: string;
}

export interface ExecutiveSummaryGenerationResponse {
	executive_summary_text: string;
}
