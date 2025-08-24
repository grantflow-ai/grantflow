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

	export type RequestBody = {
	token: string;
};
};

	export namespace AddOrganizationMember {
	export namespace Http201 {
	export type ResponseBody = {
	firebase_uid: string;
	message: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	firebase_uid: string;
	has_all_projects_access?: boolean;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: null | string;
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
	application_id: null | string;
	organization_id: null | string;
	project_id: null | string;
	template_id: null | string;
};

	export type RequestBody = {
	url: string;
};
};

	export namespace CrawlGrantingInstitutionUrl {
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
	granting_institution_id: null | string;
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
	deadline?: string;
	description?: string;
	editor_document_id: null | string;
	editor_document_init: boolean;
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
	granting_institution?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	granting_institution_id?: string;
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
	parent_id?: string;
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
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	description?: string;
	title: string;
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
	organization_id: null | string;
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
	organization_id: string;
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
	application_id: null | string;
	organization_id: null | string;
	project_id: null | string;
	template_id: null | string;
};

	export interface QueryParameters {
	blob_name: string;
};
};

	export namespace CreateGrantingInstitution {
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

	export namespace CreateGrantingInstitutionRagSourceUploadUrl {
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
	granting_institution_id: null | string;
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	email: string;
	project_ids?: string[];
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
};
};

	export namespace CreateOrganization {
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
	contact_email?: null | string;
	contact_person_name?: null | string;
	description?: null | string;
	firebase_uid: string;
	institutional_affiliation?: null | string;
	logo_url?: null | string;
	name: string;
};
};

	export namespace CreateOrganizationInvitation {
	export namespace Http201 {
	export type ResponseBody = {
	expires_at: string;
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
	organization_id: string;
};

	export type RequestBody = {
	email: string;
	has_all_projects_access?: boolean;
	project_ids?: string[];
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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

	export interface PathParameters {
	organization_id: string;
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
	organization_id: string;
	project_id: string;
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
	organization_id: null | string;
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
	application_id: null | string;
	organization_id: null | string;
	project_id: string;
	source_id: string;
	template_id: null | string;
};
};

	export namespace DeleteGrantingInstitution {
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

	export namespace DeleteGrantingInstitutionRagSource {
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
	granting_institution_id: null | string;
	source_id: string;
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
	organization_id: string;
	project_id: string;
};
};

	export namespace DeleteOrganization {
	export namespace Http200 {
	export type ResponseBody = {
	grace_period_days: number;
	message: string;
	restoration_info: string;
	scheduled_deletion_date: string;
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
};

	export namespace DeleteOrganizationInvitation {
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
	organization_id: string;
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

	export namespace DuplicateApplication {
	export namespace Http201 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	deadline?: string;
	description?: string;
	editor_document_id: null | string;
	editor_document_init: boolean;
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
	granting_institution?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	granting_institution_id?: string;
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
	parent_id?: string;
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
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	title: string;
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
	organization_id: string;
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

	export namespace GetOrganization {
	export namespace Http200 {
	export type ResponseBody = {
	contact_email: null | string;
	contact_person_name: null | string;
	created_at: string;
	description: null | string;
	id: string;
	institutional_affiliation: null | string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
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
	members: {
	display_name: null | string;
	email: string;
	firebase_uid: string;
	photo_url: null | string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
}[];
	name: string;
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
	project_id: string;
};
};

	export namespace GetSoleOwnedOrganizations {
	export namespace Http200 {
	export type ResponseBody = {
	count: number;
	organizations: {
	id: string;
	name: string;
}[];
};
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

	export namespace GrantsGrantIdGetGrantDetails {
	export namespace Http200 {
	export type ResponseBody = {
	
} | {
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
	organization: string;
	parent_organization: string;
	participating_orgs: string;
	release_date: string;
	title: string;
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
	grant_id: string;
};
};

	export namespace GrantsSearchGrants {
	export namespace Http200 {
	export type ResponseBody = {
	
} | {
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
	organization: string;
	parent_organization: string;
	participating_orgs: string;
	release_date: string;
	title: string;
	url: string;
}[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface QueryParameters {
	category?: null | string;
	deadline_after?: null | string;
	deadline_before?: null | string;
	limit?: number;
	max_amount?: null | number;
	min_amount?: null | number;
	offset?: number;
	search_query?: null | string;
};
};

	export namespace GrantsSubscribeCreateSubscription {
	export namespace Http201 {
	export type ResponseBody = {
	
} | {
	message: string;
	subscription_id: string;
	verification_required: boolean;
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
	email: string;
	frequency?: string;
	search_params: {
	category: string;
	deadline_after: string;
	deadline_before: string;
	limit: number;
	max_amount: number;
	min_amount: number;
	offset: number;
	query: string;
};
};
};

	export namespace GrantsUnsubscribeUnsubscribe {
	export namespace Http201 {
	export type ResponseBody = {
	
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
	email: string;
};
};

	export namespace GrantsVerifyTokenVerifySubscription {
	export namespace Http200 {
	export type ResponseBody = {
	
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
	token: string;
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
	deadline?: string;
	description?: string;
	id: string;
	parent_id?: string;
	project_id: string;
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
	submission_date?: string;
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
	organization_id: string;
	project_id: string;
};

	export interface QueryParameters {
	limit?: number;
	offset?: number;
	order?: string;
	search?: null | string;
	sort?: string;
	status?: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT" | null;
};
};

	export namespace ListGrantingInstitutions {
	export namespace Http200 {
	export type ResponseBody = {
	abbreviation: null | string;
	full_name: string;
	id: string;
}[];
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

	export namespace ListOrganizationApplications {
	export namespace Http200 {
	export type ResponseBody = {
	applications: {
	completed_at?: string;
	created_at: string;
	deadline?: string;
	description?: string;
	id: string;
	parent_id?: string;
	project_id: string;
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
	submission_date?: string;
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
	organization_id: string;
};
};

	export namespace ListOrganizationInvitations {
	export namespace Http200 {
	export type ResponseBody = {
	accepted_at: null | string;
	email: string;
	id: string;
	invitation_sent_at: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
};
};

	export namespace ListOrganizationMembers {
	export namespace Http200 {
	export type ResponseBody = {
	created_at: string;
	display_name: string;
	email: string;
	firebase_uid: string;
	has_all_projects_access: boolean;
	photo_url?: string;
	project_access: {
	granted_at: string;
	project_id: string;
	project_name: string;
}[];
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
	updated_at: string;
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
	organization_id: string;
};
};

	export namespace ListOrganizations {
	export namespace Http200 {
	export type ResponseBody = {
	description: null | string;
	id: string;
	logo_url: null | string;
	members_count: number;
	name: string;
	projects_count: number;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
}[];
};

	export namespace Http400 {
	export type ResponseBody = {
	detail: string;
	extra?: Record<string, unknown> | null | unknown[];
	status_code: number;
};
};

	export interface QueryParameters {
	firebase_uid?: null | string;
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
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
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
	members: {
	display_name: null | string;
	email: string;
	firebase_uid: string;
	photo_url: null | string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
}[];
	name: string;
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
	organization_id: string;
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

	export namespace RemoveMember {
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
	organization_id: string;
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
	organization_id: string;
	project_id: string;
};
};

	export namespace RestoreOrganization {
	export namespace Http200 {
	export type ResponseBody = {
	contact_email: null | string;
	contact_person_name: null | string;
	created_at: string;
	description: null | string;
	id: string;
	institutional_affiliation: null | string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
};
};

	export namespace RetrieveApplication {
	export namespace Http200 {
	export type ResponseBody = {
	completed_at?: string;
	created_at: string;
	deadline?: string;
	description?: string;
	editor_document_id: null | string;
	editor_document_init: boolean;
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
	granting_institution?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	granting_institution_id?: string;
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
	parent_id?: string;
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
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
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
	organization_id: string;
	project_id: string;
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
	organization_id: null | string;
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
	application_id: null | string;
	organization_id: null | string;
	project_id: string;
	template_id: null | string;
};
};

	export namespace RetrieveGrantingInstitutionRagSources {
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
	granting_institution_id: null | string;
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
	organization_id: string;
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
	organization_id: string;
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
	deadline?: string;
	description?: string;
	editor_document_id: null | string;
	editor_document_init: boolean;
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
	granting_institution?: {
	abbreviation?: string;
	created_at: string;
	full_name: string;
	id: string;
	updated_at: string;
};
	granting_institution_id?: string;
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
	parent_id?: string;
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
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	description: string;
	form_inputs: {
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
	status: "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";
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
	organization_id: string;
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

	export namespace UpdateGrantingInstitution {
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
};
};

	export namespace UpdateMemberRole {
	export namespace Http200 {
	export type ResponseBody = {
	firebase_uid: string;
	message: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
};

	export type RequestBody = {
	has_all_projects_access?: boolean;
	project_ids?: string[];
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
};
};

	export namespace UpdateOrganization {
	export namespace Http200 {
	export type ResponseBody = {
	contact_email: null | string;
	contact_person_name: null | string;
	created_at: string;
	description: null | string;
	id: string;
	institutional_affiliation: null | string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
};

	export type RequestBody = {
	contact_email: null | string;
	contact_person_name: null | string;
	description: null | string;
	institutional_affiliation: null | string;
	logo_url: null | string;
	name: string;
};
};

	export namespace UpdateOrganizationInvitation {
	export namespace Http200 {
	export type ResponseBody = {
	accepted_at: null | string;
	email: string;
	id: string;
	invitation_sent_at: string;
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
};

	export type RequestBody = {
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
};
};

	export namespace UpdateProject {
	export namespace Http200 {
	export type ResponseBody = {
	description: null | string;
	id: string;
	logo_url: null | string;
	name: string;
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
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
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
	organization_id: string;
	project_id: string;
};

	export type RequestBody = {
	role: "ADMIN" | "COLLABORATOR" | "OWNER";
};
};
};