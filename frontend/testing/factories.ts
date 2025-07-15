import { Factory } from "interface-forge";

import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import type { GrantSection } from "@/types/grant-sections";

type HttpErrorResponse = API.Login.Http400.ResponseBody;

export const ErrorResponseFactory = new Factory<HttpErrorResponse>((factory) => ({
	detail: factory.lorem.sentence(),
	extra: factory.datatype.boolean() ? { error: factory.lorem.word() } : null,
	status_code: factory.helpers.arrayElement([400, 401, 403, 404, 422, 500]),
}));

export const TokenResponseFactory = new Factory<API.AcceptInvitation.Http200.ResponseBody>((factory) => ({
	token: factory.string.alphanumeric(64),
}));

export const MessageResponseFactory = new Factory<{ message: string }>((factory) => ({
	message: factory.lorem.sentence(),
}));

export const UrlResponseFactory = new Factory<{ url: string }>((factory) => ({
	url: factory.internet.url(),
}));

export const JwtResponseFactory = new Factory<API.Login.Http201.ResponseBody>(() => {
	const testJwtValue =
		"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ik1vY2sgVXNlciIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoxODkzNDU2MDAwfQ.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ";
	return {
		jwt_token: testJwtValue,
	};
});

export const OtpResponseFactory = new Factory<API.GenerateOtp.Http200.ResponseBody>((factory) => ({
	otp: factory.string.numeric(6),
}));

export const OrganizationFactory = new Factory<API.CreateOrganization.Http201.ResponseBody>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : null,
	full_name: factory.company.name(),
	id: factory.string.uuid(),
}));

export const IdResponseFactory = new Factory<API.CreateProject.Http201.ResponseBody>((factory) => ({
	id: factory.string.uuid(),
}));

export const ProjectListItemFactory = new Factory<API.ListProjects.Http200.ResponseBody[0]>((factory) => ({
	applications_count: factory.number.int({ max: 10, min: 0 }),
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	id: factory.string.uuid(),
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	members: factory.helpers.multiple(
		() => ({
			display_name: factory.datatype.boolean() ? factory.person.fullName() : null,
			email: factory.internet.email(),
			firebase_uid: factory.string.uuid(),
			photo_url: factory.datatype.boolean() ? factory.image.avatar() : null,
			role: factory.helpers.arrayElement(["OWNER", "ADMIN", "MEMBER"]),
		}),
		{ count: { max: 5, min: 1 } },
	),
	name: factory.company.name(),
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "MEMBER"]),
}));

export const ProjectFactory = new Factory<API.GetProject.Http200.ResponseBody>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	grant_applications: factory.helpers.multiple(
		() => ({
			completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
			id: factory.string.uuid(),
			title: factory.lorem.sentence(),
		}),
		{ count: { max: 5, min: 0 } },
	),
	id: factory.string.uuid(),
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "MEMBER"]),
}));

type IndexingStatus = RagSource["status"];
type RagSource = NonNullable<API.CreateApplication.Http201.ResponseBody["rag_sources"]>[0];

export const RagSourceFactory = new Factory<RagSource>((factory) => {
	const isFile = factory.datatype.boolean();
	const status = factory.helpers.arrayElement<IndexingStatus>(["CREATED", "FAILED", "FINISHED", "INDEXING"]);
	return {
		sourceId: factory.string.uuid(),
		status,
		...(isFile
			? {
					filename: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt"])}`,
				}
			: { url: factory.internet.url() }),
	};
});

type FundingOrganization = NonNullable<
	API.CreateApplication.Http201.ResponseBody["grant_template"]
>["funding_organization"];

export const FundingOrganizationFactory = new Factory<NonNullable<FundingOrganization>>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : undefined,
	created_at: factory.date.past().toISOString(),
	full_name: factory.company.name(),
	id: factory.string.uuid(),
	updated_at: factory.date.recent().toISOString(),
}));

type ResearchObjective = NonNullable<API.CreateApplication.Http201.ResponseBody["research_objectives"]>[0];
type ResearchTask = ResearchObjective["research_tasks"][0];

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

type FormInputs = NonNullable<API.CreateApplication.Http201.ResponseBody["form_inputs"]>;

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

type GrantSectionBase = Extract<
	GrantSections[0],
	{ id: string; order: number; parent_id: null | string; title: string }
>;
type GrantSectionDetailed = Extract<GrantSections[0], { depends_on: string[] }>;
type GrantSections = NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>["grant_sections"];

export const GrantSectionBaseFactory = new Factory<GrantSectionBase>((factory) => ({
	id: factory.string.uuid(),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	title: factory.lorem.sentence(),
}));

export const GrantSectionDetailedFactory = new Factory<GrantSectionDetailed>((factory) => ({
	depends_on: factory.helpers.multiple(() => factory.string.uuid(), {
		count: { max: 3, min: 0 },
	}),
	generation_instructions: factory.lorem.paragraph(),
	id: factory.string.uuid(),
	is_clinical_trial: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
	is_detailed_research_plan: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
	keywords: factory.helpers.multiple(() => factory.lorem.word(), {
		count: { max: 5, min: 1 },
	}),
	max_words: factory.number.int({ max: 5000, min: 100 }),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	search_queries: factory.helpers.multiple(() => factory.lorem.sentence(), {
		count: { max: 3, min: 0 },
	}),
	title: factory.lorem.sentence(),
	topics: factory.helpers.multiple(() => factory.lorem.word(), {
		count: { max: 5, min: 1 },
	}),
}));

type GrantTemplate = NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>;

export const GrantTemplateFactory = new Factory<GrantTemplate>((factory) => ({
	created_at: factory.date.past().toISOString(),
	funding_organization: factory.datatype.boolean() ? FundingOrganizationFactory.build() : undefined,
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
	project_id: factory.string.uuid(),
	rag_sources: RagSourceFactory.batch(factory.number.int({ max: 5, min: 0 })),
	research_objectives: factory.datatype.boolean()
		? ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 }))
		: undefined,
	status: factory.helpers.arrayElement<ApplicationStatus>(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
	text: factory.datatype.boolean() ? factory.lorem.paragraphs(5) : undefined,
	title: factory.lorem.sentence(),
	updated_at: factory.date.recent().toISOString(),
}));

type RagSourceFile = Extract<RagSourceResponse, { filename: string }>;
type RagSourceResponse = API.RetrieveGrantApplicationRagSources.Http200.ResponseBody[0];
type RagSourceUrl = Extract<RagSourceResponse, { url: string }>;

export const RagSourceUrlFactory = new Factory<RagSourceUrl>((factory) => ({
	created_at: factory.date.past().toISOString(),
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	id: factory.string.uuid(),
	indexing_status: factory.helpers.arrayElement(["CREATED", "FAILED", "FINISHED", "INDEXING"]),
	title: factory.datatype.boolean() ? factory.lorem.sentence() : null,
	url: factory.internet.url(),
}));

export const RagSourceFileFactory = new Factory<RagSourceFile>((factory) => ({
	created_at: factory.date.past().toISOString(),
	filename: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt", "rtf"])}`,
	id: factory.string.uuid(),
	indexing_status: factory.helpers.arrayElement(["CREATED", "FAILED", "FINISHED", "INDEXING"]),
	mime_type: factory.helpers.arrayElement([
		"application/pdf",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		"text/plain",
		"application/rtf",
	]),
	size: factory.number.int({ max: 10_485_760, min: 1024 }),
}));

export const GrantSectionFactory = new Factory<GrantSection>((factory) => ({
	id: factory.string.uuid(),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	title: factory.lorem.sentence(),
}));

type UserRole = API.CreateInvitationRedirectUrl.RequestBody["role"];

export const InvitationFactory = new Factory<API.CreateInvitationRedirectUrl.RequestBody>((factory) => ({
	email: factory.internet.email(),
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "MEMBER"]),
}));

export const TitleRequestFactory = new Factory<API.CreateApplication.RequestBody>((factory) => ({
	title: factory.lorem.sentence(),
}));

export const CreateApplicationRequestFactory = TitleRequestFactory;

export const UpdateApplicationRequestFactory = new Factory<Partial<API.UpdateApplication.RequestBody>>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
	form_inputs: factory.datatype.boolean() ? FormInputsFactory.build() : undefined,
	research_objectives: ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 })),
	status: factory.helpers.arrayElement<ApplicationStatus>(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
	text: factory.lorem.paragraphs(3),
	title: factory.lorem.sentence(),
}));

export const ProjectRequestFactory = new Factory<API.CreateProject.RequestBody>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
}));

export const CreateProjectRequestFactory = ProjectRequestFactory;
export const UpdateProjectRequestFactory = new Factory<API.UpdateProject.RequestBody>((factory) => ({
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
}));

export const OrganizationRequestFactory = new Factory<API.CreateOrganization.RequestBody>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : null,
	full_name: factory.company.name(),
}));

export const CreateOrganizationRequestFactory = OrganizationRequestFactory;
export const UpdateOrganizationRequestFactory = new Factory<API.UpdateOrganization.RequestBody>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : null,
	full_name: factory.company.name(),
}));

export const LoginRequestFactory = new Factory<API.Login.RequestBody>((factory) => ({
	id_token: factory.string.alphanumeric(256),
}));

export const UrlRequestFactory = new Factory<API.CrawlGrantApplicationUrl.RequestBody>((factory) => ({
	url: factory.internet.url(),
}));

export const CrawlUrlRequestFactory = UrlRequestFactory;

export const CreateInvitationRequestFactory = InvitationFactory;

export const RoleRequestFactory = new Factory<API.UpdateInvitationRole.RequestBody>((factory) => ({
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "MEMBER"]),
}));

export const UpdateInvitationRoleRequestFactory = RoleRequestFactory;

export const UpdateGrantTemplateRequestFactory = new Factory<API.UpdateGrantTemplate.RequestBody>((factory) => {
	const sectionCount = factory.number.int({ max: 10, min: 1 });
	return {
		grant_sections: Array.from({ length: sectionCount }, (_, index) => ({
			depends_on: factory.helpers.multiple(() => factory.string.uuid(), { count: { max: 2, min: 0 } }),
			generation_instructions: factory.lorem.paragraph(),
			id: factory.string.uuid(),
			is_clinical_trial: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
			is_detailed_research_plan: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
			keywords: factory.helpers.multiple(() => factory.lorem.word(), { count: { max: 5, min: 1 } }),
			max_words: factory.number.int({ max: 5000, min: 100 }),
			order: index,
			parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
			search_queries: factory.helpers.multiple(() => factory.lorem.sentence(), { count: { max: 3, min: 0 } }),
			title: factory.lorem.sentence(),
			topics: factory.helpers.multiple(() => factory.lorem.word(), { count: { max: 5, min: 1 } }),
		})),
		submission_date: factory.date.future().toISOString(),
	};
});

type GrantSectionUpdateRequest = API.UpdateGrantTemplate.RequestBody["grant_sections"][0];

export const GrantSectionUpdateRequestFactory = new Factory<GrantSectionUpdateRequest>(() => ({
	depends_on: [],
	generation_instructions: "",
	id: `section-${crypto.randomUUID()}`,
	is_clinical_trial: null,
	is_detailed_research_plan: null,
	keywords: [],
	max_words: 3000,
	order: 0,
	parent_id: null,
	search_queries: [],
	title: "Category Name",
	topics: [],
}));

interface SourceProcessingNotification {
	identifier: string;
	indexing_status: IndexingStatus;
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
	indexing_status: factory.helpers.arrayElement<IndexingStatus>(["CREATED", "INDEXING", "FINISHED", "FAILED"]),
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

interface AutofillProgressNotification {
	autofill_type: "research_deep_dive" | "research_plan";
	current_stage?: number;
	data?: Record<string, unknown>;
	field_name?: string;
	message: string;
	total_stages?: number;
}

export const AutofillProgressNotificationFactory = new Factory<AutofillProgressNotification>((factory) => ({
	autofill_type: factory.helpers.arrayElement(["research_deep_dive", "research_plan"]),
	current_stage: factory.datatype.boolean() ? factory.number.int({ max: 5, min: 1 }) : undefined,
	data: factory.datatype.boolean()
		? {
				[factory.helpers.arrayElement(["field_count", "objectives_count", "questions_count"])]:
					factory.number.int({
						max: 10,
						min: 1,
					}),
			}
		: undefined,
	field_name: factory.datatype.boolean()
		? factory.helpers.arrayElement([
				"research_objectives",
				"background_context",
				"hypothesis",
				"rationale",
				"impact",
			])
		: undefined,
	message: factory.lorem.sentence(),
	total_stages: factory.datatype.boolean() ? factory.number.int({ max: 5, min: 3 }) : undefined,
}));

export const AutofillProgressMessageFactory = new Factory<WebsocketMessage<AutofillProgressNotification>>((factory) => {
	const notification = AutofillProgressNotificationFactory.build();
	return {
		data: notification,
		event: factory.helpers.arrayElement([
			"autofill_started",
			"autofill_progress",
			"autofill_completed",
			"autofill_error",
		]),
		parent_id: factory.string.uuid(),
		type: factory.datatype.boolean() && factory.helpers.maybe(() => true, { probability: 0.9 }) ? "data" : "error",
	};
});

type ApplicationListItem = API.GetProject.Http200.ResponseBody["grant_applications"][0];

export const ApplicationListItemFactory = new Factory<ApplicationListItem>((factory) => ({
	completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
	id: factory.string.uuid(),
	title: factory.lorem.sentence(),
}));

export const ApplicationWithTemplateFactory = new Factory<API.CreateApplication.Http201.ResponseBody>(() => {
	const baseApplication = ApplicationFactory.build({
		text: undefined,
	});
	const grantTemplate = GrantTemplateFactory.build({
		grant_application_id: baseApplication.id,
	});
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
	const isPending = status === "PENDING";

	return {
		completed_at: isCompleted ? factory.date.recent().toISOString() : undefined,
		created_at: factory.date.past().toISOString(),
		current_stage: factory.number.int({ max: 5, min: 1 }),
		error_details: isFailed ? {} : undefined,
		error_message: isFailed ? factory.lorem.sentence() : undefined,
		extracted_metadata: undefined,
		extracted_sections: undefined,
		failed_at: isFailed ? factory.date.recent().toISOString() : undefined,
		generated_sections: isCompleted ? {} : undefined,
		grant_application_id: jobType === "grant_application_generation" ? factory.string.uuid() : undefined,
		grant_template_id: jobType === "grant_template_generation" ? factory.string.uuid() : undefined,
		id: factory.string.uuid(),
		job_type: jobType,
		retry_count: factory.number.int({ max: 3, min: 0 }),
		started_at: isPending ? undefined : factory.date.recent().toISOString(),
		status,
		total_stages: factory.number.int({ max: 10, min: 3 }),
		updated_at: factory.date.recent().toISOString(),
		validation_results: isCompleted ? {} : undefined,
	};
});

export const ProjectMemberFactory = new Factory<API.ListProjectMembers.Http200.ResponseBody[0]>((factory) => ({
	display_name: factory.datatype.boolean() ? factory.person.fullName() : null,
	email: factory.internet.email(),
	firebase_uid: factory.string.alphanumeric(28),
	joined_at: factory.date.past().toISOString(),
	photo_url: factory.datatype.boolean() ? factory.image.avatarGitHub() : null,
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "MEMBER"]),
}));

export const UpdateMemberRoleRequestFactory = new Factory<API.UpdateProjectMemberRole.RequestBody>((factory) => ({
	role: factory.helpers.arrayElement(["ADMIN", "MEMBER"]),
}));

type ApplicationCardData = {
	deadline?: string;
	description?: string;
} & API.ListApplications.Http200.ResponseBody["applications"][0];

export const ApplicationCardDataFactory = new Factory<ApplicationCardData>((factory) => ({
	completed_at: factory.helpers.maybe(() => factory.date.past().toISOString()),
	created_at: factory.date.past().toISOString(),
	deadline: factory.datatype.boolean()
		? `${factory.number.int({ max: 12, min: 1 })} weeks and ${factory.number.int({
				max: 6,
				min: 1,
			})} days to the deadline`
		: undefined,
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
	id: factory.string.uuid(),
	project_id: factory.string.uuid(),
	status: factory.helpers.arrayElement<ApplicationStatus>(["DRAFT", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
	title: factory.lorem.sentence({ min: 3, max: 8 }),
	updated_at: factory.date.recent().toISOString(),
}));
