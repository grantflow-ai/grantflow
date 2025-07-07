export namespace API {
	export namespace AcceptInvitation {
	export namespace Http200 {
	export type ResponseBody = {
	token: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	invitation_id: string;
};
};

	export namespace CrawlFundingOrganizationUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: null | string;
};

	export type RequestBody = {
	url: string;
};
};

	export namespace CrawlGrantApplicationUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: null | string;
	project_id: null | string;
};

	export type RequestBody = {
	url: string;
};
};

	export namespace CrawlGrantTemplateUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: null | string;
	template_id: null | string;
};

	export type RequestBody = {
	url: string;
};
};

	export namespace CreateApplication {
	export namespace Http201 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	form_inputs?: {
	background_context: string;
	hypothesis: string;
	impact: string;
	novelty_and_innovation: string;
	preliminary_data: string;
	rationale: string;
	research_feasibility: string;
	scientific_infrastructure: string;
	team_excellence: string;
};
	grant_template?: {
	created_at: string;
	funding_organization?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	funding_organization_id?: string;
	grant_application_id: string;
	grant_sections: ({
	depends_on: string[];
	generation_instructions: string;
	id: string;
	is_clinical_trial: boolean | null;
	is_detailed_research_plan: boolean | null;
	keywords: string[];
	max_words: number;
	order: number;
	parent_id: null | string;
	search_queries: string[];
	title: string;
	topics: string[];
} | {
	id: string;
	order: number;
	parent_id: null | string;
	title: string;
})[];
	id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	submission_date?: string;
	updated_at: string;
};
	id: string;
	project_id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	research_objectives?: {
	description?: string;
	number: number;
	research_tasks: {
	description?: string;
	number: number;
	title: string;
}[];
	title: string;
}[];
	status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
	text?: string;
	title: string;
	updated_at: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};

	export type RequestBody = {
	title: string;
};
};

	export namespace CreateFundingOrganizationRagSourceUploadUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
	url: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: null | string;
};

	export interface QueryParameters {
	blob_name: string;
};
};

	export namespace CreateGrantApplicationRagSourceUploadUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
	url: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: null | string;
	project_id: null | string;
};

	export interface QueryParameters {
	blob_name: string;
};
};

	export namespace CreateGrantTemplate {
	export namespace Http201 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	grant_template_id: string;
	project_id: string;
};
};

	export namespace CreateGrantTemplateRagSourceUploadUrl {
	export namespace Http201 {
	export type ResponseBody = {
	source_id: string;
	url: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: null | string;
	template_id: null | string;
};

	export interface QueryParameters {
	blob_name: string;
};
};

	export namespace CreateInvitationRedirectUrl {
	export namespace Http201 {
	export type ResponseBody = {
	token: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};

	export type RequestBody = {
	email: string;
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};

	export namespace CreateOrganization {
	export namespace Http201 {
	export type ResponseBody = {
	abbreviation: null | string;
	full_name: string;
	id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export type RequestBody = {
	abbreviation: null | string;
	full_name: string;
};
};

	export namespace CreateProject {
	export namespace Http201 {
	export type ResponseBody = {
	id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export type RequestBody = {
	description: null | string;
	logo_url?: null | string;
	name: string;
};
};

	export namespace DeleteApplication {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	project_id: string;
};
};

	export namespace DeleteFundingOrganizationRagSource {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: null | string;
	source_id: string;
};
};

	export namespace DeleteGrantApplicationRagSource {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: null | string;
	project_id: string;
	source_id: string;
};
};

	export namespace DeleteGrantTemplateRagSource {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
	source_id: string;
	template_id: null | string;
};
};

	export namespace DeleteInvitation {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	invitation_id: string;
	project_id: string;
};
};

	export namespace DeleteOrganization {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: string;
};
};

	export namespace DeleteProject {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};
};

	export namespace DeleteUser {
	export namespace Http200 {
	export type ResponseBody = {
	grace_period_days: number;
	message: string;
	restoration_info: string;
	scheduled_deletion_date: string;
};
};
};

	export namespace DismissNotification {
	export namespace Http200 {
	export type ResponseBody = {
	notification_id: string;
	success: boolean;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	notification_id: string;
};
};

	export namespace GenerateApplication {
	export namespace Http201 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	project_id: string;
};
};

	export namespace GenerateOtp {
	export namespace Http200 {
	export type ResponseBody = {
	otp: string;
};
};
};

	export namespace GetProject {
	export namespace Http200 {
	export type ResponseBody = {
	description: null | string;
	grant_applications: {
	completed_at: null | string;
	id: string;
	title: string;
}[];
	id: string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};
};

	export namespace GetSoleOwnedProjects {
	export namespace Http200 {
	export type ResponseBody = {
	count: number;
	projects: {
	id: string;
	name: string;
}[];
};
};
};

	export namespace HealthCheck {
	export namespace Http200 {
	export type ResponseBody = string;
};
};

	export namespace ListApplications {
	export namespace Http200 {
	export type ResponseBody = {
	applications: {
	completed_at?: string;
	created_at: string;
	id: string;
	project_id: string;
	status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
	title: string;
	updated_at: string;
}[];
	pagination: {
	has_more: boolean;
	limit: number;
	offset: number;
	total: number;
};
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};

	export interface QueryParameters {
	limit?: number;
	offset?: number;
	order?: string;
	search?: null | string;
	sort?: string;
	status?: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS" | null;
};
};

	export namespace ListNotifications {
	export namespace Http200 {
	export type ResponseBody = {
	notifications: {
	created_at: string;
	dismissed: boolean;
	expires_at?: string;
	extra_data?: {
	
};
	id: string;
	message: string;
	project_id?: string;
	project_name?: string;
	read: boolean;
	title: string;
	type: string;
}[];
	total: number;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface QueryParameters {
	include_read?: boolean;
};
};

	export namespace ListOrganizations {
	export namespace Http200 {
	export type ResponseBody = {
	abbreviation: null | string;
	full_name: string;
	id: string;
}[];
};
};

	export namespace ListProjectMembers {
	export namespace Http200 {
	export type ResponseBody = {
	display_name: null | string;
	email: string;
	firebase_uid: string;
	joined_at: string;
	photo_url: null | string;
	role: "ADMIN" | "MEMBER" | "OWNER";
}[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};
};

	export namespace ListProjects {
	export namespace Http200 {
	export type ResponseBody = {
	applications_count: number;
	description: null | string;
	id: string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "MEMBER" | "OWNER";
}[];
};
};

	export namespace Login {
	export namespace Http201 {
	export type ResponseBody = {
	jwt_token: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export type RequestBody = {
	id_token: string;
};
};

	export namespace RemoveProjectMember {
	export namespace Http204 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	firebase_uid: string;
	project_id: string;
};
};

	export namespace RetrieveApplication {
	export namespace Http200 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	form_inputs?: {
	background_context: string;
	hypothesis: string;
	impact: string;
	novelty_and_innovation: string;
	preliminary_data: string;
	rationale: string;
	research_feasibility: string;
	scientific_infrastructure: string;
	team_excellence: string;
};
	grant_template?: {
	created_at: string;
	funding_organization?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	funding_organization_id?: string;
	grant_application_id: string;
	grant_sections: ({
	depends_on: string[];
	generation_instructions: string;
	id: string;
	is_clinical_trial: boolean | null;
	is_detailed_research_plan: boolean | null;
	keywords: string[];
	max_words: number;
	order: number;
	parent_id: null | string;
	search_queries: string[];
	title: string;
	topics: string[];
} | {
	id: string;
	order: number;
	parent_id: null | string;
	title: string;
})[];
	id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	submission_date?: string;
	updated_at: string;
};
	id: string;
	project_id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	research_objectives?: {
	description?: string;
	number: number;
	research_tasks: {
	description?: string;
	number: number;
	title: string;
}[];
	title: string;
}[];
	status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
	text?: string;
	title: string;
	updated_at: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	project_id: string;
};
};

	export namespace RetrieveFundingOrganizationRagSources {
	export namespace Http200 {
	export type ResponseBody = ({
	created_at: string;
	description: null | string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	title: null | string;
	url: string;
} | {
	created_at: string;
	filename: string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	mime_type: string;
	size: number;
})[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: null | string;
};
};

	export namespace RetrieveGrantApplicationRagSources {
	export namespace Http200 {
	export type ResponseBody = ({
	created_at: string;
	description: null | string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	title: null | string;
	url: string;
} | {
	created_at: string;
	filename: string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	mime_type: string;
	size: number;
})[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: null | string;
	project_id: string;
};
};

	export namespace RetrieveGrantTemplateRagSources {
	export namespace Http200 {
	export type ResponseBody = ({
	created_at: string;
	description: null | string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	title: null | string;
	url: string;
} | {
	created_at: string;
	filename: string;
	id: string;
	indexing_status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	mime_type: string;
	size: number;
})[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
	template_id: null | string;
};
};

	export namespace RetrieveRagJob {
	export namespace Http200 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	current_stage: number;
	error_details?: {
	
};
	error_message?: string;
	extracted_metadata?: {
	
};
	extracted_sections?: {
	
}[];
	failed_at?: string;
	generated_sections?: {
	
};
	grant_application_id?: string;
	grant_template_id?: string;
	id: string;
	job_type: string;
	retry_count: number;
	started_at?: string;
	status: "CANCELLED" | "COMPLETED" | "FAILED" | "PENDING" | "PROCESSING";
	total_stages: number;
	updated_at: string;
	validation_results?: {
	
};
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	job_id: string;
	project_id: string;
};
};

	export namespace TriggerAutofill {
	export namespace Http201 {
	export type ResponseBody = {
	application_id: string;
	autofill_type: string;
	field_name?: string;
	message_id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	project_id: string;
};

	export type RequestBody = {
	autofill_type: "research_deep_dive" | "research_plan";
	context?: {
	
};
	field_name?: string;
};
};

	export namespace UpdateApplication {
	export namespace Http200 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	form_inputs?: {
	background_context: string;
	hypothesis: string;
	impact: string;
	novelty_and_innovation: string;
	preliminary_data: string;
	rationale: string;
	research_feasibility: string;
	scientific_infrastructure: string;
	team_excellence: string;
};
	grant_template?: {
	created_at: string;
	funding_organization?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	funding_organization_id?: string;
	grant_application_id: string;
	grant_sections: ({
	depends_on: string[];
	generation_instructions: string;
	id: string;
	is_clinical_trial: boolean | null;
	is_detailed_research_plan: boolean | null;
	keywords: string[];
	max_words: number;
	order: number;
	parent_id: null | string;
	search_queries: string[];
	title: string;
	topics: string[];
} | {
	id: string;
	order: number;
	parent_id: null | string;
	title: string;
})[];
	id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	submission_date?: string;
	updated_at: string;
};
	id: string;
	project_id: string;
	rag_job_id?: string;
	rag_sources: {
	filename?: string;
	sourceId: string;
	status: "CREATED" | "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}[];
	research_objectives?: {
	description?: string;
	number: number;
	research_tasks: {
	description?: string;
	number: number;
	title: string;
}[];
	title: string;
}[];
	status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
	text?: string;
	title: string;
	updated_at: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	project_id: string;
};

	export type RequestBody = {
	form_inputs: {
	
};
	research_objectives: {
	description?: string;
	number: number;
	research_tasks: {
	description?: string;
	number: number;
	title: string;
}[];
	title: string;
}[];
	status: "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";
	text: string;
	title: string;
};
};

	export namespace UpdateGrantTemplate {
	export namespace Http200 {
	export type ResponseBody = undefined;
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	application_id: string;
	grant_template_id: string;
	project_id: string;
};

	export type RequestBody = {
	grant_sections: {
	depends_on: string[];
	generation_instructions: string;
	id: string;
	is_clinical_trial: boolean | null;
	is_detailed_research_plan: boolean | null;
	keywords: string[];
	max_words: number;
	order: number;
	parent_id: null | string;
	search_queries: string[];
	title: string;
	topics: string[];
}[];
	submission_date: string;
};
};

	export namespace UpdateInvitationRole {
	export namespace Http200 {
	export type ResponseBody = {
	token: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	invitation_id: string;
	project_id: string;
};

	export type RequestBody = {
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};

	export namespace UpdateOrganization {
	export namespace Http200 {
	export type ResponseBody = {
	abbreviation: null | string;
	full_name: string;
	id: string;
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	organization_id: string;
};

	export type RequestBody = {
	abbreviation: null | string;
	full_name: string;
};
};

	export namespace UpdateProject {
	export namespace Http200 {
	export type ResponseBody = {
	description: null | string;
	id: string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	project_id: string;
};

	export type RequestBody = {
	description: null | string;
	logo_url: null | string;
	name: string;
};
};

	export namespace UpdateProjectMemberRole {
	export namespace Http200 {
	export type ResponseBody = {
	display_name: null | string;
	email: string;
	firebase_uid: string;
	joined_at: string;
	photo_url: null | string;
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface PathParameters {
	firebase_uid: string;
	project_id: string;
};

	export type RequestBody = {
	role: "ADMIN" | "MEMBER" | "OWNER";
};
};
};