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

export interface DraftGenerationRequest {
	workspace_id: string;
	application_id: string;
	application_title: string;
	cfp_title: string;
	grant_funding_organization: string;
	significance_description: string;
	significance_id: string;
	innovation_description: string;
	innovation_id: string;
	research_aims: ResearchAimDTO[];
}
