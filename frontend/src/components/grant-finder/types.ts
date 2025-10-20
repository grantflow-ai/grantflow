import type { API } from "@/types/api-types";

export interface FormData {
	activityCodes: string[];
	agreeToTerms: boolean;
	agreeToUpdates: boolean;
	careerStage: string[];
	email: string;
	institutionLocation: string[];
	keywords: string;
}
export type Grant = GrantsResponse extends infer T | Record<string, never> ? ExtractArrayType<T> : never;
export interface SearchParams {
	activityCodes?: string[];
	careerStage?: string[];

	email?: string;
	institutionLocation?: string[];
	keywords?: string[];
}

type ExtractArrayType<T> = T extends readonly (infer U)[] ? U : never;

type GrantsResponse = API.GrantsHandleSearchGrants.Http200.ResponseBody;

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
