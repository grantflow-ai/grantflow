import { Factory } from "interface-forge";
import type { FormData, Grant, SearchParams } from "@/components/grant-finder/types";
import { SourceIndexingStatus } from "@/enums";
import type {
	RagProcessingStatusMessage as RagProcessingStatusType,
	SourceProcessingNotification,
	WebsocketMessage,
} from "@/hooks/use-application-notifications";
import type { API } from "@/types/api-types";
import type { FileWithId } from "@/types/files";
import type { GrantSection } from "@/types/grant-sections";
import type { RagEvent } from "@/types/notification-events";

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
		is_backoffice_admin: false,
		jwt_token: testJwtValue,
	};
});

export const OtpResponseFactory = new Factory<API.GenerateOtp.Http200.ResponseBody>((factory) => ({
	otp: factory.string.numeric(6),
}));

export const OrganizationFactory = new Factory<API.CreateOrganization.Http201.ResponseBody>((factory) => ({
	abbreviation: factory.datatype.boolean() ? factory.string.alpha({ length: 3 }).toUpperCase() : undefined,
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
			role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"]),
		}),
		{ count: { max: 5, min: 1 } },
	),
	name: factory.company.name(),
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
	members: factory.helpers.multiple(
		() => ({
			display_name: factory.datatype.boolean() ? factory.person.fullName() : null,
			email: factory.internet.email(),
			firebase_uid: factory.string.uuid(),
			photo_url: factory.datatype.boolean() ? factory.image.avatar() : null,
			role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"]),
		}),
		{ count: { max: 5, min: 1 } },
	),
	name: factory.company.name(),
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"]),
}));

export const DuplicateProjectResponseFactory = new Factory<API.DuplicateProject.Http201.ResponseBody>((factory) => ({
	created_at: factory.date.recent().toISOString(),
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
	members: factory.helpers.multiple(
		() => ({
			display_name: factory.datatype.boolean() ? factory.person.fullName() : null,
			email: factory.internet.email(),
			firebase_uid: factory.string.uuid(),
			photo_url: factory.datatype.boolean() ? factory.image.avatar() : null,
			role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"] as const),
		}),
		{ count: { max: 5, min: 1 } },
	),
	name: `Copy of ${factory.company.name()}`,
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"]),
	updated_at: factory.date.recent().toISOString(),
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

type GrantingInstitution = NonNullable<
	API.CreateApplication.Http201.ResponseBody["grant_template"]
>["granting_institution"];

export const GrantingInstitutionFactory = new Factory<NonNullable<GrantingInstitution>>((factory) => ({
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

export const EmptyFormInputsFactory = {
	build: (overrides: Partial<FormInputs> = {}): FormInputs => {
		const defaults: FormInputs = {
			background_context: "",
			hypothesis: "",
			impact: "",
			novelty_and_innovation: "",
			preliminary_data: "",
			rationale: "",
			research_feasibility: "",
			scientific_infrastructure: "",
			team_excellence: "",
		};
		return { ...defaults, ...overrides };
	},
};

type GrantSectionBase = Extract<
	GrantSections[0],
	{ id: string; order: number; parent_id: null | string; title: string }
>;
type GrantSectionDetailed = Extract<GrantSections[0], { depends_on: string[] }>;
type GrantSections = NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>["grant_sections"];

export const GrantSectionBaseFactory = new Factory<GrantSectionBase>((factory) => ({
	evidence: factory.lorem.sentence(),
	id: factory.string.uuid(),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	title: factory.lorem.sentence(),
}));

export const GrantSectionDetailedFactory = new Factory<GrantSectionDetailed>((factory) => ({
	depends_on: factory.helpers.multiple(() => factory.string.uuid(), {
		count: { max: 3, min: 0 },
	}),
	evidence: factory.lorem.sentence(),
	generation_instructions: factory.lorem.paragraph(),
	id: factory.string.uuid(),
	is_clinical_trial: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
	is_detailed_research_plan: factory.helpers.maybe(() => factory.datatype.boolean()) ?? null,
	keywords: factory.helpers.multiple(() => factory.lorem.word(), {
		count: { max: 5, min: 1 },
	}),
	length_constraint: {
		source: null,
		type: "words",
		value: factory.number.int({ max: 5000, min: 100 }),
	},
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

export type GrantTemplateResponse = NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>;

export const GrantTemplateFactory = new Factory<GrantTemplateResponse>((factory) => ({
	created_at: factory.date.past().toISOString(),
	grant_application_id: factory.string.uuid(),
	grant_sections: factory.helpers.multiple(
		() => (factory.datatype.boolean() ? GrantSectionDetailedFactory.build() : GrantSectionBaseFactory.build()),
		{ count: { max: 10, min: 1 } },
	),
	grant_type: factory.helpers.arrayElement(["RESEARCH", "TRANSLATIONAL"]),
	granting_institution: factory.datatype.boolean() ? GrantingInstitutionFactory.build() : undefined,
	granting_institution_id: factory.datatype.boolean() ? factory.string.uuid() : undefined,
	id: factory.string.uuid(),
	rag_sources: RagSourceFactory.batch(factory.number.int({ max: 5, min: 0 })),
	submission_date: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
	updated_at: factory.date.recent().toISOString(),
}));

type ApplicationStatus = "CANCELLED" | "GENERATING" | "IN_PROGRESS" | "WORKING_DRAFT";

export const ApplicationFactory = new Factory<API.CreateApplication.Http201.ResponseBody>((factory) => ({
	completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : undefined,
	created_at: factory.date.past().toISOString(),
	deadline: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
	editor_document_id: "123",
	editor_document_init: false,
	form_inputs: factory.datatype.boolean() ? FormInputsFactory.build() : undefined,
	grant_template: factory.datatype.boolean() ? GrantTemplateFactory.build() : undefined,
	id: factory.string.uuid(),
	project_id: factory.string.uuid(),
	rag_sources: RagSourceFactory.batch(factory.number.int({ max: 5, min: 0 })),
	research_objectives: factory.datatype.boolean()
		? ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 }))
		: undefined,
	status: factory.helpers.arrayElement<ApplicationStatus>([
		"WORKING_DRAFT",
		"IN_PROGRESS",
		"GENERATING",
		"CANCELLED",
	]),
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
	evidence: factory.lorem.sentence(),
	id: factory.string.uuid(),
	order: factory.number.int({ max: 20, min: 0 }),
	parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
	title: factory.lorem.sentence(),
}));

type UserRole = API.CreateInvitationRedirectUrl.RequestBody["role"];

export const InvitationFactory = new Factory<API.CreateInvitationRedirectUrl.RequestBody>((factory) => ({
	email: factory.internet.email(),
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "COLLABORATOR"]),
}));

export const TitleRequestFactory = new Factory<API.CreateApplication.RequestBody>((factory) => ({
	title: factory.lorem.sentence(),
}));

export const CreateApplicationRequestFactory = TitleRequestFactory;

export const UpdateApplicationRequestFactory = new Factory<Required<API.UpdateApplication.RequestBody>>((factory) => ({
	description: factory.lorem.paragraph(),
	form_inputs: FormInputsFactory.build(),
	research_objectives: ResearchObjectiveFactory.batch(factory.number.int({ max: 3, min: 1 })),
	status: factory.helpers.arrayElement<ApplicationStatus>([
		"WORKING_DRAFT",
		"IN_PROGRESS",
		"GENERATING",
		"CANCELLED",
	]),
	text: factory.lorem.paragraphs(3),
	title: factory.lorem.sentence(),
}));

export const ProjectRequestFactory = new Factory<Required<API.CreateProject.RequestBody>>((factory) => ({
	description: factory.lorem.paragraph(),
	logo_url: factory.image.url(),
	name: factory.company.name(),
}));

export const CreateProjectRequestFactory = ProjectRequestFactory;
export const UpdateProjectRequestFactory = new Factory<Required<API.UpdateProject.RequestBody>>((factory) => ({
	description: factory.lorem.paragraph(),
	logo_url: factory.image.url(),
	name: factory.company.name(),
}));

export const OrganizationRequestFactory = new Factory<Required<API.CreateOrganization.RequestBody>>((factory) => ({
	contact_email: factory.internet.email(),
	contact_person_name: factory.person.fullName(),
	description: factory.lorem.paragraph(),
	firebase_uid: factory.string.alphanumeric(28),
	institutional_affiliation: factory.company.name(),
	logo_url: factory.image.url(),
	name: factory.company.name(),
}));

export const CreateOrganizationRequestFactory = OrganizationRequestFactory;
export const UpdateOrganizationRequestFactory = new Factory<Required<API.UpdateOrganization.RequestBody>>(
	(factory) => ({
		contact_email: factory.internet.email(),
		contact_person_name: factory.person.fullName(),
		description: factory.lorem.paragraph(),
		institutional_affiliation: factory.company.name(),
		logo_url: factory.image.url(),
		name: factory.company.name(),
	}),
);

export const LoginRequestFactory = new Factory<API.Login.RequestBody>((factory) => ({
	id_token: factory.string.alphanumeric(256),
}));

export const UrlRequestFactory = new Factory<API.CrawlGrantApplicationUrl.RequestBody>((factory) => ({
	url: factory.internet.url(),
}));

export const CrawlUrlRequestFactory = UrlRequestFactory;

export const CreateInvitationRequestFactory = InvitationFactory;

export const RoleRequestFactory = new Factory<API.UpdateInvitationRole.RequestBody>((factory) => ({
	role: factory.helpers.arrayElement<UserRole>(["OWNER", "ADMIN", "COLLABORATOR"]),
}));

export const UpdateInvitationRoleRequestFactory = RoleRequestFactory;

export const UpdateGrantTemplateRequestFactory = new Factory<API.UpdateGrantTemplate.RequestBody>((factory) => {
	const sectionCount = factory.number.int({ max: 10, min: 1 });
	return {
		grant_sections: Array.from(
			{ length: sectionCount },
			(_, index) =>
				GrantSectionDetailedFactory.build({
					depends_on: factory.helpers.multiple(() => factory.string.uuid(), {
						count: { max: 2, min: 0 },
					}),
					id: factory.string.uuid(),
					length_constraint: {
						source: null,
						type: "words",
						value: factory.number.int({ max: 5000, min: 100 }),
					},
					order: index,
					parent_id: factory.datatype.boolean() ? factory.string.uuid() : null,
					title: factory.lorem.sentence(),
				}) as GrantSectionUpdateRequest,
		),
		submission_date: factory.date.future().toISOString(),
	};
});

type GrantSectionUpdateRequest = NonNullable<API.UpdateGrantTemplate.RequestBody["grant_sections"]>[0];

export const GrantSectionUpdateRequestFactory = new Factory<GrantSectionUpdateRequest>(
	() =>
		GrantSectionDetailedFactory.build({
			depends_on: [],
			generation_instructions: "",
			id: `section-${crypto.randomUUID()}`,
			is_clinical_trial: null,
			is_detailed_research_plan: null,
			keywords: [],
			length_constraint: {
				source: null,
				type: "words",
				value: 3000,
			},
			order: 0,
			parent_id: null,
			search_queries: [],
			title: "Category Name",
			topics: [],
		}) as GrantSectionUpdateRequest,
);

export const SourceProcessingNotificationFactory = new Factory<SourceProcessingNotification>((factory) => ({
	identifier: `${factory.lorem.word()}.${factory.helpers.arrayElement(["pdf", "docx", "txt"])}`,
	indexing_status: factory.helpers.arrayElement([
		SourceIndexingStatus.INDEXING,
		SourceIndexingStatus.FINISHED,
		SourceIndexingStatus.FAILED,
	]),
	source_id: factory.string.uuid(),
}));

export const WebSocketMessageFactory = new Factory<WebsocketMessage<unknown>>((factory) => ({
	data: {},
	event: factory.helpers.arrayElement(["source_processing", "template_generation", "error"]),
	parent_id: factory.string.uuid(),
	type: factory.helpers.arrayElement(["info", "error", "warning", "success"]),
}));

export const SourceProcessingNotificationMessageFactory = new Factory<WebsocketMessage<SourceProcessingNotification>>(
	(factory) => {
		const notification = SourceProcessingNotificationFactory.build();
		return {
			data: notification,
			event: "source_processing",
			parent_id: factory.string.uuid(),
			type: "info",
		};
	},
);

export const RagProcessingStatusFactory = new Factory<RagProcessingStatusType>((factory) => ({
	data: {
		[factory.helpers.arrayElement(["section_count", "objective_count", "total_tasks"])]: factory.number.int({
			max: 10,
			min: 1,
		}),
		...(factory.datatype.boolean() ? { organization: factory.company.name() } : {}),
	},
	event: factory.helpers.arrayElement([
		"grant_application_generation_completed",
		"objectives_enriched",
		"section_texts_generated",
		"cfp_data_extracted",
		"grant_template_created",
		"job_cancelled",
		"pipeline_error",
	]) as RagEvent,
	parent_id: factory.string.uuid(),
	type: "info",
}));

export const RagProcessingStatusMessageFactory = new Factory<WebsocketMessage<Record<string, unknown>>>((factory) => {
	return {
		data: {
			[factory.helpers.arrayElement(["section_count", "objective_count", "total_tasks"])]: factory.number.int({
				max: 10,
				min: 1,
			}),
			...(factory.datatype.boolean() ? { organization: factory.company.name() } : {}),
		},
		event: factory.helpers.arrayElement([
			"grant_application_generation_completed",
			"objectives_enriched",
			"section_texts_generated",
			"cfp_data_extracted",
			"grant_template_created",
			"job_cancelled",
			"pipeline_error",
		]) as RagEvent,
		parent_id: factory.string.uuid(),
		type: "info",
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
		type: factory.datatype.boolean() && factory.helpers.maybe(() => true, { probability: 0.9 }) ? "info" : "error",
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
		editor_document_id: "123",
		editor_document_init: false,
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
		current_stage: isPending ? null : factory.number.int({ max: 5, min: 1 }).toString(),
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
	role: factory.helpers.arrayElement(["OWNER", "ADMIN", "COLLABORATOR"]),
}));

export const UpdateMemberRoleRequestFactory = new Factory<API.UpdateProjectMemberRole.RequestBody>((factory) => ({
	role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR"]),
}));

type ApplicationCardData = {
	deadline?: string;
	description?: string;
} & API.ListApplications.Http200.ResponseBody["applications"][0];

export const ApplicationCardDataFactory = new Factory<ApplicationCardData>((factory) => ({
	completed_at: factory.helpers.maybe(() => factory.date.past().toISOString()),
	created_at: factory.date.past().toISOString(),
	deadline: factory.helpers.maybe(() => factory.date.future().toISOString()),
	description: factory.helpers.maybe(() => factory.lorem.paragraph()),
	id: factory.string.uuid(),
	project_id: factory.string.uuid(),
	status: factory.helpers.arrayElement<ApplicationStatus>([
		"WORKING_DRAFT",
		"IN_PROGRESS",
		"GENERATING",
		"CANCELLED",
	]),
	title: factory.lorem.sentence({ max: 8, min: 3 }),
	updated_at: factory.date.recent().toISOString(),
}));

export const AddOrganizationMemberResponseFactory = new Factory<API.AddOrganizationMember.Http201.ResponseBody>(
	(factory) => ({
		firebase_uid: factory.string.alphanumeric(28),
		message: factory.lorem.sentence(),
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
	}),
);

export const CreateOrganizationResponseFactory = new Factory<API.CreateOrganization.Http201.ResponseBody>(
	(factory) => ({
		id: factory.string.uuid(),
	}),
);

export const CreateOrganizationInvitationResponseFactory =
	new Factory<API.CreateOrganizationInvitation.Http201.ResponseBody>((factory) => ({
		expires_at: factory.date.future().toISOString(),
		token: factory.string.alphanumeric(64),
	}));

export const CreateGrantingInstitutionRagSourceUploadUrlResponseFactory =
	new Factory<API.CreateGrantingInstitutionRagSourceUploadUrl.Http201.ResponseBody>((factory) => ({
		source_id: factory.string.uuid(),
		url: factory.internet.url(),
	}));

export const GetOrganizationResponseFactory = new Factory<API.GetOrganization.Http200.ResponseBody>((factory) => ({
	contact_email: factory.datatype.boolean() ? factory.internet.email() : null,
	contact_person_name: factory.datatype.boolean() ? factory.person.fullName() : null,
	created_at: factory.date.past().toISOString(),
	description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
	id: factory.string.uuid(),
	institutional_affiliation: factory.datatype.boolean() ? factory.company.name() : null,
	logo_url: factory.datatype.boolean() ? factory.image.url() : null,
	name: factory.company.name(),
	role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
	updated_at: factory.date.recent().toISOString(),
}));

export const ListOrganizationInvitationsResponseFactory =
	new Factory<API.ListOrganizationInvitations.Http200.ResponseBody>((factory) =>
		factory.helpers.multiple(
			() => ({
				accepted_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
				email: factory.internet.email(),
				id: factory.string.uuid(),
				invitation_sent_at: factory.date.past().toISOString(),
				role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
			}),
			{ count: { max: 5, min: 0 } },
		),
	);

export const ListOrganizationMembersResponseFactory = new Factory<API.ListOrganizationMembers.Http200.ResponseBody>(
	(factory) =>
		factory.helpers.multiple(
			() => ({
				created_at: factory.date.past().toISOString(),
				display_name: factory.person.fullName(),
				email: factory.internet.email(),
				firebase_uid: factory.string.alphanumeric(28),
				has_all_projects_access: factory.datatype.boolean(),
				photo_url: factory.datatype.boolean() ? factory.image.avatar() : undefined,
				project_access: factory.helpers.multiple(
					() => ({
						granted_at: factory.date.past().toISOString(),
						project_id: factory.string.uuid(),
						project_name: factory.company.name(),
					}),
					{ count: { max: 3, min: 0 } },
				),
				role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
				updated_at: factory.date.recent().toISOString(),
			}),
			{ count: { max: 5, min: 1 } },
		),
);

export const ListOrganizationsResponseFactory = new Factory<API.ListOrganizations.Http200.ResponseBody>((factory) =>
	factory.helpers.multiple(
		() => ({
			description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
			id: factory.string.uuid(),
			logo_url: factory.datatype.boolean() ? factory.image.url() : null,
			members_count: factory.number.int({ max: 20, min: 1 }),
			name: factory.company.name(),
			projects_count: factory.number.int({ max: 10, min: 0 }),
			role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
		}),
		{ count: { max: 5, min: 1 } },
	),
);

export const RestoreOrganizationResponseFactory = new Factory<API.RestoreOrganization.Http200.ResponseBody>(
	(factory) => ({
		contact_email: factory.datatype.boolean() ? factory.internet.email() : null,
		contact_person_name: factory.datatype.boolean() ? factory.person.fullName() : null,
		created_at: factory.date.past().toISOString(),
		description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
		id: factory.string.uuid(),
		institutional_affiliation: factory.datatype.boolean() ? factory.company.name() : null,
		logo_url: factory.datatype.boolean() ? factory.image.url() : null,
		name: factory.company.name(),
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
		updated_at: factory.date.recent().toISOString(),
	}),
);

export const UpdateOrganizationResponseFactory = new Factory<API.UpdateOrganization.Http200.ResponseBody>(
	(factory) => ({
		contact_email: factory.datatype.boolean() ? factory.internet.email() : null,
		contact_person_name: factory.datatype.boolean() ? factory.person.fullName() : null,
		created_at: factory.date.past().toISOString(),
		description: factory.datatype.boolean() ? factory.lorem.paragraph() : null,
		id: factory.string.uuid(),
		institutional_affiliation: factory.datatype.boolean() ? factory.company.name() : null,
		logo_url: factory.datatype.boolean() ? factory.image.url() : null,
		name: factory.company.name(),
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
		updated_at: factory.date.recent().toISOString(),
	}),
);

export const UpdateOrganizationInvitationResponseFactory =
	new Factory<API.UpdateOrganizationInvitation.Http200.ResponseBody>((factory) => ({
		accepted_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : null,
		email: factory.internet.email(),
		id: factory.string.uuid(),
		invitation_sent_at: factory.date.past().toISOString(),
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
	}));

export const UpdateMemberRoleResponseFactory = new Factory<API.UpdateMemberRole.Http200.ResponseBody>((factory) => ({
	firebase_uid: factory.string.alphanumeric(28),
	message: factory.lorem.sentence(),
	role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
}));

export const ListApplicationsResponseFactory = new Factory<API.ListApplications.Http200.ResponseBody>((factory) => ({
	applications: factory.helpers.multiple(
		() => ({
			completed_at: factory.datatype.boolean() ? factory.date.recent().toISOString() : undefined,
			created_at: factory.date.past().toISOString(),
			deadline: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
			description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
			id: factory.string.uuid(),
			parent_id: factory.datatype.boolean() ? factory.string.uuid() : undefined,
			project_id: factory.string.uuid(),
			status: factory.helpers.arrayElement<ApplicationStatus>([
				"WORKING_DRAFT",
				"IN_PROGRESS",
				"GENERATING",
				"CANCELLED",
			]),
			submission_date: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
			title: factory.lorem.sentence(),
			updated_at: factory.date.recent().toISOString(),
		}),
		{ count: { max: 10, min: 0 } },
	),
	pagination: {
		has_more: factory.datatype.boolean(),
		limit: factory.number.int({ max: 50, min: 10 }),
		offset: factory.number.int({ max: 100, min: 0 }),
		total: factory.number.int({ max: 100, min: 0 }),
	},
}));

export const TriggerAutofillResponseFactory = new Factory<API.TriggerAutofill.Http201.ResponseBody>((factory) => ({
	application_id: factory.string.uuid(),
	autofill_type: factory.helpers.arrayElement(["research_deep_dive", "research_plan"]),
	field_name: factory.datatype.boolean()
		? factory.helpers.arrayElement([
				"background_context",
				"hypothesis",
				"impact",
				"novelty_and_innovation",
				"preliminary_data",
				"rationale",
				"research_feasibility",
				"scientific_infrastructure",
				"team_excellence",
			])
		: undefined,
	message_id: factory.string.uuid(),
}));

export const TriggerAutofillRequestFactory = new Factory<API.TriggerAutofill.RequestBody>((factory) => ({
	autofill_type: factory.helpers.arrayElement(["research_deep_dive", "research_plan"] as const),
	context: factory.datatype.boolean() ? {} : undefined,
	field_name: factory.datatype.boolean()
		? factory.helpers.arrayElement([
				"background_context",
				"hypothesis",
				"impact",
				"novelty_and_innovation",
				"preliminary_data",
				"rationale",
				"research_feasibility",
				"scientific_infrastructure",
				"team_excellence",
			])
		: undefined,
}));

export const DismissNotificationResponseFactory = new Factory<API.DismissNotification.Http200.ResponseBody>(
	(factory) => ({
		notification_id: factory.string.uuid(),
		success: true,
	}),
);

export const ListNotificationsResponseFactory = new Factory<API.ListNotifications.Http200.ResponseBody>((factory) => ({
	notifications: factory.helpers.multiple(
		() => ({
			created_at: factory.date.past().toISOString(),
			dismissed: factory.datatype.boolean(),
			expires_at: factory.datatype.boolean() ? factory.date.future().toISOString() : undefined,
			extra_data: factory.datatype.boolean() ? {} : undefined,
			id: factory.string.uuid(),
			message: factory.lorem.sentence(),
			project_id: factory.datatype.boolean() ? factory.string.uuid() : undefined,
			project_name: factory.datatype.boolean() ? factory.company.name() : undefined,
			read: factory.datatype.boolean(),
			title: factory.lorem.sentence(),
			type: factory.helpers.arrayElement(["info", "warning", "error", "success"]),
		}),
		{ count: { max: 10, min: 0 } },
	),
	total: factory.number.int({ max: 100, min: 0 }),
}));

export const AddOrganizationMemberRequestFactory = new Factory<API.AddOrganizationMember.RequestBody>((factory) => ({
	firebase_uid: factory.string.alphanumeric(28),
	has_all_projects_access: factory.datatype.boolean(),
	role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
}));

export const CreateOrganizationInvitationRequestFactory = new Factory<API.CreateOrganizationInvitation.RequestBody>(
	(factory) => ({
		email: factory.internet.email(),
		has_all_projects_access: factory.datatype.boolean(),
		project_ids: factory.datatype.boolean()
			? factory.helpers.multiple(() => factory.string.uuid(), {
					count: { max: 3, min: 1 },
				})
			: undefined,
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
	}),
);

export const UpdateOrganizationInvitationRequestFactory = new Factory<API.UpdateOrganizationInvitation.RequestBody>(
	(factory) => ({
		role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
	}),
);

export const UpdateMemberRoleOrgRequestFactory = new Factory<API.UpdateMemberRole.RequestBody>((factory) => ({
	has_all_projects_access: factory.datatype.boolean(),
	project_ids: factory.datatype.boolean()
		? factory.helpers.multiple(() => factory.string.uuid(), {
				count: { max: 3, min: 1 },
			})
		: undefined,
	role: factory.helpers.arrayElement(["ADMIN", "COLLABORATOR", "OWNER"]),
}));

export const GrantFactory = new Factory<Grant>((factory) => {
	const today = new Date();
	const futureDate = new Date(today.getTime() + factory.number.int({ max: 90, min: 1 }) * 24 * 60 * 60 * 1000);

	return {
		activity_code: factory.helpers.arrayElement([
			"R01",
			"R21",
			"R03",
			"K99",
			"F31",
			"F32",
			"T32",
			"P01",
			"U01",
			"SBIR",
		]),
		amount: factory.datatype.boolean()
			? `$${factory.number.int({ max: 1_000_000, min: 100_000 }).toLocaleString()}`
			: undefined,
		amount_max: factory.datatype.boolean() ? factory.number.int({ max: 2_000_000, min: 500_000 }) : undefined,
		amount_min: factory.datatype.boolean() ? factory.number.int({ max: 500_000, min: 50_000 }) : undefined,
		category: factory.datatype.boolean()
			? factory.helpers.arrayElement([
					"Basic Research",
					"Clinical Research",
					"Training",
					"Career Development",
					"Small Business",
				])
			: undefined,
		clinical_trials: factory.helpers.arrayElement(["Required", "Optional", "Not Allowed"]),
		deadline: factory.datatype.boolean() ? futureDate.toISOString() : undefined,
		description: factory.datatype.boolean() ? factory.lorem.paragraph() : undefined,
		document_number: factory.string.alphanumeric({ length: 10 }),
		document_type: factory.helpers.arrayElement([
			"Notice of Funding Opportunity",
			"Program Announcement",
			"Request for Applications",
		]),
		eligibility: factory.datatype.boolean() ? factory.lorem.sentence() : undefined,
		expired_date: factory.date.future().toISOString(),
		id: factory.string.uuid(),
		organization: factory.helpers.arrayElement([
			"National Institutes of Health",
			"National Science Foundation",
			"Department of Energy",
			"Department of Defense",
			"NIH",
		]),
		parent_organization: "U.S. Department of Health and Human Services",
		participating_orgs: factory.helpers
			.multiple(() => factory.company.name(), { count: { max: 3, min: 0 } })
			.join(", "),
		release_date: factory.date.past().toISOString(),
		title: factory.lorem.sentence({ max: 12, min: 5 }),
		url: factory.internet.url(),
	};
});

export const SearchParamsFactory = new Factory<SearchParams>((factory) => ({
	activityCodes: factory.datatype.boolean()
		? factory.helpers.multiple(
				() =>
					factory.helpers.arrayElement([
						"R01",
						"R21",
						"R03",
						"K99",
						"F31",
						"F32",
						"T32",
						"P01",
						"U01",
						"SBIR",
					]),
				{ count: { max: 3, min: 1 } },
			)
		: undefined,
	careerStage: factory.datatype.boolean()
		? [factory.helpers.arrayElement(["Early-stage (≤ 10 yrs)", "Mid-career (11–20 yrs)", "Senior (> 20 yrs)"])]
		: undefined,
	email: factory.datatype.boolean() ? factory.internet.email() : undefined,
	institutionLocation: factory.datatype.boolean()
		? [
				factory.helpers.arrayElement([
					"U.S. institution (no foreign component)",
					"U.S. institution with foreign component",
					"Non-U.S. (foreign) institution",
				]),
			]
		: undefined,
	keywords: factory.helpers.multiple(() => factory.lorem.word(), { count: { max: 5, min: 1 } }),
}));

export const FormDataFactory = new Factory<FormData>((factory) => ({
	activityCodes: factory.helpers.multiple(
		() => factory.helpers.arrayElement(["R01", "R21", "R03", "K99", "F31", "F32", "T32", "P01", "U01", "SBIR"]),
		{ count: { max: 3, min: 0 } },
	),
	agreeToTerms: factory.datatype.boolean(),
	agreeToUpdates: factory.datatype.boolean(),
	careerStage: [
		factory.helpers.arrayElement(["Early-stage (≤ 10 yrs)", "Mid-career (11–20 yrs)", "Senior (> 20 yrs)"]),
	],
	email: factory.internet.email(),
	institutionLocation: [
		factory.helpers.arrayElement([
			"U.S. institution (no foreign component)",
			"U.S. institution with foreign component",
			"Non-U.S. (foreign) institution",
		]),
	],
	keywords: factory.helpers.multiple(() => factory.lorem.word(), { count: { max: 5, min: 1 } }).join(", "),
}));

export const GrantsSearchResponseFactory = new Factory<API.GrantsHandleSearchGrants.Http200.ResponseBody>(
	(factory) =>
		GrantFactory.batch(
			factory.number.int({ max: 20, min: 0 }),
		) as API.GrantsHandleSearchGrants.Http200.ResponseBody,
);

export const GrantSubscriptionRequestFactory = new Factory<API.CreateSubscription.RequestBody>((factory) => ({
	email: factory.internet.email(),
	search_params: {
		category: factory.datatype.boolean() ? factory.lorem.word() : "",
		deadline_after: factory.datatype.boolean() ? factory.date.recent().toISOString().split("T")[0] : "",
		deadline_before: factory.datatype.boolean() ? factory.date.future().toISOString().split("T")[0] : "",
		limit: factory.number.int({ max: 50, min: 10 }),
		max_amount: factory.datatype.boolean() ? factory.number.int({ max: 2_000_000, min: 100_000 }) : 0,
		min_amount: factory.datatype.boolean() ? factory.number.int({ max: 100_000, min: 0 }) : 0,
		offset: factory.number.int({ max: 100, min: 0 }),
		query: factory.lorem.words({ max: 5, min: 1 }),
	},
}));

export const GrantSubscriptionResponseFactory = new Factory<API.CreateSubscription.Http201.ResponseBody>((factory) => ({
	id: factory.string.uuid(),
	message: factory.lorem.sentence(),
}));
