import { Factory } from "interface-forge";
import {
	GrantApplication,
	GrantCFP,
	FundingOrganization,
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

export const GrantApplicationFactory = new Factory<GrantApplication>((factory) => ({
	cfp_id: factory.string.uuid(),
	created_at: new Date().toISOString(),
	deleted_at: null,
	id: factory.string.uuid(),
	is_resubmission: factory.datatype.boolean(),
	title: factory.lorem.words(),
	innovation: factory.lorem.paragraphs(),
	significance: factory.lorem.paragraphs(),
	updated_at: new Date().toISOString(),
	workspace_id: factory.string.uuid(),
}));

export const GrantCFPFactory = new Factory<GrantCFP>((factory) => ({
	allow_clinical_trials: factory.datatype.boolean(),
	allow_resubmissions: factory.datatype.boolean(),
	created_at: new Date().toISOString(),
	deleted_at: null,
	funding_organization_id: factory.string.uuid(),
	code: factory.helpers.arrayElement([
		"R01",
		"R03",
		"R18",
		"R21",
		"R24",
		"R25",
		"R33",
		"R34",
		"R35",
		"R41",
		"R42",
		"R43",
		"R44",
		"R50",
		"R61",
	]),
	title: factory.lorem.words(),
	description: factory.lorem.sentence(),
	category: factory.lorem.words(),
	id: factory.string.uuid(),
	updated_at: new Date().toISOString(),
	url: factory.helpers.arrayElement([null, factory.internet.url()]),
}));

export const FundingOrganizationFactory = new Factory<FundingOrganization>((factory) => ({
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
	description: factory.lorem.sentence(),
	draft_id: factory.string.uuid(),
	file_urls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	required_clinical_trials: factory.datatype.boolean(),
	application_id: factory.string.uuid(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
}));

export const ResearchTaskFactory = new Factory<ResearchTask>((factory) => ({
	created_at: new Date().toISOString(),
	deleted_at: null,
	description: factory.lorem.sentence(),
	file_urls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	aim_id: factory.string.uuid(),
	title: factory.lorem.words(),
	updated_at: new Date().toISOString(),
}));
