export interface FormData {
	activityCodes: string[];
	agreeToTerms: boolean;
	agreeToUpdates: boolean;
	careerStage: string;
	email: string;
	institutionLocation: string;
	keywords: string;
}

export interface Grant {
	activity_code: string;
	amount?: string;
	amount_max?: number;
	amount_min?: number;
	category?: string;
	clinical_trials: string;
	deadline?: string;
	description?: string;
	document_number: string;
	document_type: string;
	eligibility?: string;
	expired_date: string;
	id: string;
	opportunity_number?: string;
	organization: string;
	parent_organization: string;
	participating_orgs: string;
	release_date: string;
	title: string;
	url?: string;
}

export interface SearchParams {
	activityCodes?: string[];
	careerStage?: string;
	email?: string;
	institutionLocation?: string;
	keywords: string[];
}

export const ACTIVITY_CODES = [
	"R01 - Research Project Grant",
	"R21 - Exploratory/Developmental Research Grant",
	"R03 - Small Grant Program",
	"K99 - Career Transition Award",
	"F31 - Predoctoral Fellowship",
	"F32 - Postdoctoral Fellowship",
	"T32 - Training Grant",
	"P01 - Program Project Grant",
	"U01 - Research Project Cooperative Agreement",
	"SBIR - Small Business Innovation Research",
];

export const INSTITUTION_LOCATIONS = [
	"U.S. institution (no foreign component)",
	"U.S. institution with foreign component",
	"Non-U.S. (foreign) institution",
];

export const CAREER_STAGES = ["Early-stage (≤ 10 yrs)", "Mid-career (11–20 yrs)", "Senior (> 20 yrs)"];
