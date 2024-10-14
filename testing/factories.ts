import { Factory } from "interface-forge";
import {
	ApplicationDraft,
	GrantApplicationAnswer,
	GrantApplicationQuestion,
	GrantCFP,
	GrantFundingOrganization,
	GrantWizardSection,
	ResearchAim,
	ResearchTask,
	User,
	Workspace,
} from "@/types/database-types";

export const UserFactory = new Factory<User>((factory) => ({
	app_metadata: {},
	user_metadata: {},

	aud: factory.string.uuid(),
	avatar_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	created_at: new Date().toISOString(),
	email: factory.internet.email(),
	name: factory.person.fullName(),
	id: factory.string.uuid(),
	updated_at: new Date().toISOString(),
}));

export const WorkspaceFactory = new Factory<Workspace>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	logo_url: "https://via.placeholder.com/150?text=Logo+3",
	name: factory.lorem.sentence(),
	updated_at: new Date().toISOString(),
}));

export const GrantWizardSectionFactory = new Factory<GrantWizardSection>((factory) => ({
	cfp_id: factory.string.uuid(),
	clinical_trials_only: factory.datatype.boolean(),
	created_at: new Date().toISOString(),
	deleted_at: null,
	help_text: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	is_research_plan_section: factory.datatype.boolean(),
	ordering: factory.number.int({ min: 1, max: 10 }),
	resubmission_only: factory.datatype.boolean(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
}));

export const GrantApplicationQuestionFactory = new Factory<GrantApplicationQuestion>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	depends_on: factory.helpers.arrayElement([null, [factory.string.uuid(), factory.string.uuid()]]),
	external_links: factory.helpers.arrayElement([null, [factory.internet.url()]]),
	file_upload: factory.datatype.boolean(),
	help_text: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	input_type: factory.helpers.arrayElement(["text", "boolean", "date", "date-range"]),
	max_length: factory.helpers.arrayElement([null, factory.number.int({ min: 10, max: 500 })]),
	ordering: factory.number.int({ min: 1, max: 10 }),
	question_type: factory.helpers.arrayElement(["per-section", "per-research-aim", "per-research-task"]),
	required: factory.datatype.boolean(),
	section_id: factory.string.uuid(),
	text: factory.lorem.sentence(),
	updated_at: new Date().toISOString(),
}));

export const ApplicationDraftFactory = new Factory<ApplicationDraft>((factory) => ({
	cfp_id: factory.string.uuid(),
	created_at: new Date().toISOString(),
	deleted_at: null,
	id: factory.string.uuid(),
	is_resubmission: factory.datatype.boolean(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
	workspace_id: factory.string.uuid(),
}));

export const GrantApplicationAnswerFactory = new Factory<GrantApplicationAnswer>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	draft_id: factory.string.uuid(),
	file_urls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	question_id: factory.string.uuid(),
	question_type: factory.helpers.arrayElement(["per-section", "per-research-aim", "per-research-task"]),
	research_aim_id: factory.helpers.arrayElement([null, factory.string.uuid()]),
	task_id: factory.helpers.arrayElement([null, factory.string.uuid()]),
	updated_at: new Date().toISOString(),
	value: factory.helpers.arrayElement([
		null,
		factory.lorem.sentence(),
		factory.number.int(),
		factory.datatype.boolean(),
	]),
}));

export const GrantCFPFactory = new Factory<GrantCFP>((factory) => ({
	allow_clinical_trials: factory.datatype.boolean(),
	allow_resubmissions: factory.datatype.boolean(),
	created_at: new Date().toISOString(),
	deleted_at: null,
	funding_organization_id: factory.string.uuid(),
	grant_identifier: factory.lorem.word(),
	id: factory.string.uuid(),
	max_research_aims: factory.number.int({ min: 1, max: 10 }),
	max_tasks: factory.number.int({ min: 1, max: 10 }),
	text: factory.helpers.arrayElement([null, factory.lorem.paragraph()]),
	updated_at: new Date().toISOString(),
	url: factory.helpers.arrayElement([null, factory.internet.url()]),
}));

export const GrantFundingOrganizationFactory = new Factory<GrantFundingOrganization>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	id: factory.string.uuid(),
	logo_url: "https://via.placeholder.com/150?text=Logo+3",
	name: factory.company.name(),
	updated_at: new Date().toISOString(),
}));

export const ResearchAimFactory = new Factory<ResearchAim>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	draft_id: factory.string.uuid(),
	file_urls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	includes_clinical_trials: factory.datatype.boolean(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
}));

export const ResearchTaskFactory = new Factory<ResearchTask>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	file_urls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	research_aim_id: factory.string.uuid(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
}));
