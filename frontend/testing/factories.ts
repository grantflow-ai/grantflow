import { Factory } from "interface-forge";

import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";

interface ErrorResponse {
	detail: string;
	extra?: null | Record<string, unknown> | unknown[];
	status_code: number;
}

interface MessageResponse {
	message: string;
}

interface TokenResponse {
	token: string;
}

interface UrlResponse {
	url: string;
}

export const ErrorResponseFactory = new Factory<ErrorResponse>((factory) => ({
	detail: factory.lorem.sentence(),
	extra: factory.datatype.boolean() ? { error: factory.lorem.word() } : null,
	status_code: factory.helpers.arrayElement([400, 401, 403, 404, 422, 500]),
}));

export const TokenResponseFactory = new Factory<TokenResponse>((factory) => ({
	token: factory.string.alphanumeric(64),
}));

export const MessageResponseFactory = new Factory<MessageResponse>((factory) => ({
	message: factory.lorem.sentence(),
}));

export const UrlResponseFactory = new Factory<UrlResponse>((factory) => ({
	url: factory.internet.url(),
}));

export const JwtResponseFactory = new Factory<API.Login.Http201.ResponseBody>((factory) => ({
	jwt_token: factory.string.alphanumeric(128),
}));

export const OtpResponseFactory = new Factory<API.GenerateOtp.Http200.ResponseBody>((factory) => ({
	otp: factory.string.numeric(6),
}));

interface IdResponse {
	id: string;
}

interface Organization {
	abbreviation: null | string;
	full_name: string;
	id: string;
}

interface WorkspaceBase {
	description: null | string;
	id: string;
	logo_url: null | string;
	name: string;
	role: "ADMIN" | "MEMBER" | "OWNER";
}

export const OrganizationFactory = new Factory<Organization>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : null,
	full_name: factory.company.name(),
	id: factory.string.uuid(),
}));

export const IdResponseFactory = new Factory<IdResponse>((factory) => ({
	id: factory.string.uuid(),
}));

export const WorkspaceBaseFactory = new Factory<WorkspaceBase>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	id: factory.string.uuid(),
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "MEMBER"]),
}));

export const WorkspaceFactory = new Factory<API.GetWorkspace.Http200.ResponseBody>((factory) => ({
	...WorkspaceBaseFactory.build(),
	grant_applications: factory.helpers.multiple(
		() => ({
			completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
			id: factory.string.uuid(),
			title: factory.lorem.sentence(),
		}),
		{ count: { max: 5, min: 0 } },
	),
}));

export const WorkspaceListItemFactory = WorkspaceBaseFactory;

type IndexingStatus = "FAILED" | "FINISHED" | "INDEXING";

interface RagSource {
	filename?: string;
	sourceId: string;
	status: "FAILED" | "FINISHED" | "INDEXING";
	url?: string;
}

export const RagSourceFactory = new Factory<RagSource>((factory) => {
	const isFile = factory.datatype.boolean();
	return {
		sourceId: factory.string.uuid(),
		status: factory.helpers.arrayElement<IndexingStatus>(["FAILED", "FINISHED", "INDEXING"]),
		...(isFile
			? {
					filename: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt"])}`,
				}
			: { url: factory.internet.url() }),
	};
});

type FundingOrganization = {
	abbreviation?: string;
	created_at: string;
	updated_at: string;
} & Organization;

export const FundingOrganizationFactory = new Factory<FundingOrganization>((factory) => ({
	...OrganizationFactory.build(),
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : (null as any),
	created_at: factory.date.past().toISOString(),
	updated_at: factory.date.recent().toISOString(),
}));

type ResearchObjective = {
	research_tasks: ResearchTask[];
} & ResearchTask;

interface ResearchTask {
	description?: string;
	number: number;
	title: string;
}

export const ResearchTaskFactory = new Factory<ResearchTask>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
	number: factory.number.int({ max: 10, min: 1 }),
	title: factory.lorem.sentence(),
}));

export const ResearchObjectiveFactory = new Factory<ResearchObjective>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
	number: factory.number.int({ max: 5, min: 1 }),
	research_tasks: ResearchTaskFactory.batch(factory.number.int({ max: 4, min: 1 })),
	title: factory.lorem.sentence(),
}));

interface FormInputs {
	background_context: string;
	hypothesis: string;
	impact: string;
	novelty_and_innovation: string;
	preliminary_data: string;
	rationale: string;
	research_feasibility: string;
	scientific_infrastructure: string;
	team_excellence: string;
}

export const FormInputsFactory = new Factory<FormInputs>((factory) => ({
	background_context: factory.lorem.paragraphs(2),
	hypothesis: factory.lorem.paragraph(),
	impact: factory.lorem.paragraph(),
	novelty_and_innovation: factory.lorem.paragraph(),
	preliminary_data: factory.lorem.paragraphs(2),
	rationale: factory.lorem.paragraph(),
	research_feasibility: factory.lorem.paragraph(),
	scientific_infrastructure: factory.lorem.paragraph(),
	team_excellence: factory.lorem.paragraph(),
}));

interface GrantSectionBase {
	id: string;
	order: number;
	parent_id: null | string;
	title: string;
}

type GrantSectionDetailed = {
	depends_on: string[];
	generation_instructions: string;
	is_clinical_trial: boolean | null;
	is_detailed_workplan: boolean | null;
	keywords: string[];
	max_words: number;
	search_queries: string[];
	topics: string[];
} & GrantSectionBase;

export const GrantSectionBaseFactory = new Factory<GrantSectionBase>((factory) => ({
	id: factory.string.uuid(),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	title: factory.lorem.sentence(),
}));

export const GrantSectionDetailedFactory = new Factory<GrantSectionDetailed>((factory) => ({
	...GrantSectionBaseFactory.build(),
	depends_on: factory.helpers.multiple(() => factory.string.uuid(), {
		count: { max: 3, min: 0 },
	}),
	generation_instructions: factory.lorem.paragraph(),
	// eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
	is_clinical_trial: factory.datatype.boolean() ? factory.datatype.boolean() : null,
	// eslint-disable-next-line unicorn/prefer-logical-operator-over-ternary
	is_detailed_workplan: factory.datatype.boolean() ? factory.datatype.boolean() : null,
	keywords: factory.helpers.multiple(() => factory.lorem.word(), {
		count: { max: 5, min: 1 },
	}),
	max_words: factory.number.int({ max: 5000, min: 100 }),
	search_queries: factory.helpers.multiple(() => factory.lorem.sentence(), {
		count: { max: 3, min: 0 },
	}),
	topics: factory.helpers.multiple(() => factory.lorem.word(), {
		count: { max: 5, min: 1 },
	}),
}));

interface GrantTemplate {
	created_at: string;
	funding_organization?: FundingOrganization;
	funding_organization_id?: string;
	grant_application_id: string;
	grant_sections: (GrantSectionBase | GrantSectionDetailed)[];
	id: string;
	rag_job_id?: string;
	rag_sources: RagSource[];
	submission_date?: string;
	updated_at: string;
}

export const GrantTemplateFactory = new Factory<GrantTemplate>((factory) => ({
	created_at: factory.date.past().toISOString(),
	funding_organization: factory.datatype.boolean() ? (FundingOrganizationFactory.build() as any) : undefined,
	funding_organization_id: factory.datatype.boolean() ? factory.string.uuid() : undefined,
	grant_application_id: factory.string.uuid(),
	grant_sections: factory.helpers.multiple(
		() => (factory.datatype.boolean() ? GrantSectionDetailedFactory.build() : GrantSectionBaseFactory.build()),
		{ count: { max: 10, min: 1 } },
	),
	id: factory.string.uuid(),
	rag_job_id: factory.datatype.boolean() ? factory.string.uuid() : undefined,
	rag_sources: RagSourceFactory.batch(factory.number.int({ max: 5, min: 0 })),
	submission_date: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
	updated_at: factory.date.recent().toISOString(),
}));

type ApplicationStatus = "CANCELLED" | "COMPLETED" | "DRAFT" | "IN_PROGRESS";

export const ApplicationFactory = new Factory<API.CreateApplication.Http201.ResponseBody>((factory) => ({
	completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : undefined,
	created_at: factory.date.past().toISOString(),
	form_inputs: factory.datatype.boolean() ? FormInputsFactory.build() : undefined,
	grant_template: factory.datatype.boolean() ? (GrantTemplateFactory.build() as any) : undefined,
	id: factory.string.uuid(),
	rag_sources: RagSourceFactory.batch(factory.number.int({ max: 5, min: 0 })),
	research_objectives: factory.datatype.boolean()
		? ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 }))
		: undefined,
	status: factory.helpers.arrayElement<ApplicationStatus>(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
	text: factory.datatype.boolean() ? factory.lorem.paragraphs(5) : undefined,
	title: factory.lorem.sentence(),
	updated_at: factory.date.recent().toISOString(),
	workspace_id: factory.string.uuid(),
}));

interface RagSourceBase {
	created_at: string;
	id: string;
	indexing_status: IndexingStatus;
}

type RagSourceFile = {
	filename: string;
	mime_type: string;
	size: number;
} & RagSourceBase;

type RagSourceUrl = {
	description: null | string;
	title: null | string;
	url: string;
} & RagSourceBase;

export const RagSourceUrlFactory = new Factory<RagSourceUrl>((factory) => ({
	created_at: factory.date.past().toISOString(),
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	id: factory.string.uuid(),
	indexing_status: factory.helpers.arrayElement<IndexingStatus>(["FAILED", "FINISHED", "INDEXING"]),
	title: factory.datatype.boolean() ? factory.lorem.sentence() : null,
	url: factory.internet.url(),
}));

export const RagSourceFileFactory = new Factory<RagSourceFile>((factory) => ({
	created_at: factory.date.past().toISOString(),
	filename: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt", "rtf"])}`,
	id: factory.string.uuid(),
	indexing_status: factory.helpers.arrayElement<IndexingStatus>(["FAILED", "FINISHED", "INDEXING"]),
	mime_type: factory.helpers.arrayElement([
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"text/plain",
		"application/rtf",
	]),
	size: factory.number.int({ max: 10_485_760, min: 1024 }),
}));

interface Invitation {
	email: string;
	role: UserRole;
}

type UserRole = "ADMIN" | "MEMBER" | "OWNER";

export const InvitationFactory = new Factory<Invitation>((factory) => ({
	email: factory.internet.email(),
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "MEMBER"]),
}));

interface TitleRequest {
	title: string;
}

export const TitleRequestFactory = new Factory<TitleRequest>((factory) => ({
	title: factory.lorem.sentence(),
}));

export const CreateApplicationRequestFactory = TitleRequestFactory;

export const UpdateApplicationRequestFactory = new Factory<API.UpdateApplication.RequestBody>((factory) => ({
	form_inputs: {},
	research_objectives: ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 })),
	status: factory.helpers.arrayElement<ApplicationStatus>(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
	title: factory.lorem.sentence(),
}));

interface WorkspaceRequest {
	description: null | string;
	logo_url?: null | string;
	name: string;
}

export const WorkspaceRequestFactory = new Factory<WorkspaceRequest>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
}));

export const CreateWorkspaceRequestFactory = WorkspaceRequestFactory;
export const UpdateWorkspaceRequestFactory = WorkspaceRequestFactory;

interface OrganizationRequest {
	abbreviation: null | string;
	full_name: string;
}

export const OrganizationRequestFactory = new Factory<OrganizationRequest>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : null,
	full_name: factory.company.name(),
}));

export const CreateOrganizationRequestFactory = OrganizationRequestFactory;
export const UpdateOrganizationRequestFactory = OrganizationRequestFactory;

export const LoginRequestFactory = new Factory<API.Login.RequestBody>((factory) => ({
	id_token: factory.string.alphanumeric(256),
}));

interface UrlRequest {
	url: string;
}

export const UrlRequestFactory = new Factory<UrlRequest>((factory) => ({
	url: factory.internet.url(),
}));

export const CrawlUrlRequestFactory = UrlRequestFactory;

export const CreateInvitationRequestFactory = InvitationFactory;

interface RoleRequest {
	role: UserRole;
}

export const RoleRequestFactory = new Factory<RoleRequest>((factory) => ({
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "MEMBER"]),
}));

export const UpdateInvitationRoleRequestFactory = RoleRequestFactory;

export const UpdateGrantTemplateRequestFactory = new Factory<API.UpdateGrantTemplate.RequestBody>((factory) => ({
	grant_sections: GrantSectionDetailedFactory.batch(factory.number.int({ max: 10, min: 1 })),
	submission_date: factory.date.future().toISOString(),
}));

type GrantSectionUpdateRequest = API.UpdateGrantTemplate.RequestBody["grant_sections"][0];

export const GrantSectionUpdateRequestFactory = new Factory<GrantSectionUpdateRequest>((factory, iteration) => ({
	depends_on: factory.helpers.arrayElements(
		["section-intro", "section-background", "section-methodology", "section-budget"],
		{ max: 2, min: 0 },
	),
	generation_instructions: factory.lorem.sentences({ max: 3, min: 1 }),
	id: factory.string.uuid(),
	is_clinical_trial: factory.datatype.boolean({ probability: 0.3 }) ? factory.datatype.boolean() : null,
	is_detailed_workplan: factory.datatype.boolean({ probability: 0.4 }) ? factory.datatype.boolean() : null,
	keywords: factory.helpers.arrayElements(
		["research", "innovation", "methodology", "analysis", "hypothesis", "outcomes", "implementation", "evaluation"],
		{ max: 5, min: 0 },
	),
	max_words: factory.helpers.arrayElement([500, 1000, 1500, 2000, 3000, 5000]),
	order: iteration,
	parent_id: factory.datatype.boolean({ probability: 0.2 }) ? factory.string.uuid() : null,
	search_queries: factory.helpers.multiple(() => factory.lorem.words({ max: 4, min: 2 }), {
		count: { max: 3, min: 0 },
	}),
	title: factory.helpers.arrayElement([
		"Executive Summary",
		"Research Background",
		"Methodology",
		"Project Timeline",
		"Budget Justification",
		"Impact Statement",
		"Literature Review",
		"Technical Approach",
		`Section ${iteration + 1}`,
	]),
	topics: factory.helpers.arrayElements(
		[
			"healthcare",
			"technology",
			"education",
			"environment",
			"social impact",
			"economic development",
			"sustainability",
			"community engagement",
		],
		{ max: 4, min: 0 },
	),
}));

interface SourceProcessingNotification {
	identifier: string;
	indexing_status: "FAILED" | "FINISHED" | "INDEXING";
	parent_id: string;
	parent_type: string;
	rag_source_id: string;
}

interface WebsocketMessage<T> {
	data: T;
	event: string;
	parent_id: string;
	type: "data" | "error" | "info";
}

export const SourceProcessingNotificationFactory = new Factory<SourceProcessingNotification>((factory) => ({
	identifier: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt"])}`,
	indexing_status: factory.helpers.arrayElement<IndexingStatus>(["INDEXING", "FINISHED", "FAILED"]),
	parent_id: factory.string.uuid(),
	parent_type: factory.helpers.arrayElement(["grant_application", "grant_template"]),
	rag_source_id: factory.string.uuid(),
}));

export const WebSocketMessageFactory = new Factory<WebsocketMessage<unknown>>((factory) => ({
	data: {},
	event: factory.helpers.arrayElement(["source_processing", "template_generation", "error"]),
	parent_id: factory.string.uuid(),
	type: factory.helpers.arrayElement(["data", "error", "info"]),
}));

export const SourceProcessingNotificationMessageFactory = new Factory<WebsocketMessage<SourceProcessingNotification>>(
	() => {
		const notification = SourceProcessingNotificationFactory.build();
		return {
			data: notification,
			event: "source_processing",
			parent_id: notification.parent_id,
			type: "data",
		};
	},
);

interface RagProcessingStatus {
	current_pipeline_stage?: number;
	data?: Record<string, unknown>;
	event: string;
	message: string;
	total_pipeline_stages?: number;
}

export const RagProcessingStatusFactory = new Factory<RagProcessingStatus>((factory) => ({
	current_pipeline_stage: factory.datatype.boolean() ? factory.number.int({ max: 10, min: 1 }) : undefined,
	data: factory.datatype.boolean()
		? {
				[factory.helpers.arrayElement(["section_count", "objective_count", "total_tasks"])]: factory.number.int(
					{
						max: 10,
						min: 1,
					},
				),
				...(factory.datatype.boolean() ? { organization: factory.company.name() } : {}),
			}
		: undefined,
	event: factory.helpers.arrayElement([
		"grant_template_extraction",
		"sections_extracted",
		"grant_template_metadata",
		"extracting_relationships",
		"enriching_objectives",
		"objectives_enriched",
	]),
	message: factory.lorem.sentence(),
	total_pipeline_stages: factory.datatype.boolean() ? factory.number.int({ max: 10, min: 3 }) : undefined,
}));

export const RagProcessingStatusMessageFactory = new Factory<WebsocketMessage<RagProcessingStatus>>((factory) => {
	const status = RagProcessingStatusFactory.build();
	return {
		data: status,
		event: status.event,
		parent_id: factory.string.uuid(),
		type: "data",
	};
});

interface ApplicationListItem {
	completed_at: null | string;
	id: string;
	title: string;
}

export const ApplicationListItemFactory = new Factory<ApplicationListItem>((factory) => ({
	completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
	id: factory.string.uuid(),
	title: factory.lorem.sentence(),
}));

export const ApplicationWithTemplateFactory = new Factory<API.CreateApplication.Http201.ResponseBody>(() => {
	const baseApplication = ApplicationFactory.build();
	const grantTemplate = GrantTemplateFactory.build({
		grant_application_id: baseApplication.id,
	}) as NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>;
	return {
		...baseApplication,
		grant_template: grantTemplate,
	};
});

export const FileWithIdFactory = new Factory<FileWithId>((factory) => {
	const filename = `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt", "rtf"])}`;
	const type = factory.helpers.arrayElement([
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"text/plain",
		"application/rtf",
	]);
	const size = factory.number.int({ max: 10_485_760, min: 1024 });
	const lastModified = factory.date.recent().getTime();

	const file = new File([new ArrayBuffer(size)], filename, {
		lastModified,
		type,
	}) as FileWithId;
	file.id = factory.string.uuid();

	return file;
});

export const RagJobResponseFactory = new Factory<API.RetrieveRagJob.Http200.ResponseBody>((factory) => {
	const jobType = factory.helpers.arrayElement(["grant_application_generation", "grant_template_generation"]);
	const status = factory.helpers.arrayElement<"CANCELLED" | "COMPLETED" | "FAILED" | "PENDING" | "PROCESSING">([
		"CANCELLED",
		"COMPLETED",
		"FAILED",
		"PENDING",
		"PROCESSING",
	]);
	const isCompleted = status === "COMPLETED";
	const isFailed = status === "FAILED";

	return {
		completed_at: isCompleted ? factory.date.recent().toISOString() : undefined,
		created_at: factory.date.past().toISOString(),
		current_stage: factory.number.int({ max: 5, min: 1 }),
		error_details: isFailed
			? {
					details: factory.lorem.sentence(),
					error_type: factory.helpers.arrayElement(["ExtractionError", "ValidationError", "ProcessingError"]),
				}
			: undefined,
		error_message: isFailed ? factory.lorem.sentence() : undefined,
		failed_at: isFailed ? factory.date.recent().toISOString() : undefined,
		generated_sections:
			jobType === "grant_application_generation" && isCompleted
				? {
						[factory.lorem.word()]: factory.lorem.paragraph(),
						introduction: factory.lorem.paragraphs(2),
						methodology: factory.lorem.paragraphs(3),
					}
				: undefined,
		grant_application_id: jobType === "grant_application_generation" ? factory.string.uuid() : undefined,
		grant_template_id: jobType === "grant_template_generation" ? factory.string.uuid() : undefined,
		id: factory.string.uuid(),
		job_type: jobType,
		retry_count: factory.number.int({ max: 3, min: 0 }),
		status,
		total_stages: factory.number.int({ max: 10, min: 3 }),
		updated_at: factory.date.recent().toISOString(),
		validation_results:
			jobType === "grant_application_generation" && isCompleted
				? {
						is_valid: factory.datatype.boolean(),
						score: factory.number.float({ max: 1, min: 0 }),
					}
				: undefined,
	};
});

export const CreateGrantApplicationRagSourceUploadUrlResponseFactory =
	new Factory<API.CreateGrantApplicationRagSourceUploadUrl.Http201.ResponseBody>((factory) => ({
		source_id: factory.string.uuid(),
		url: factory.internet.url(),
	}));
