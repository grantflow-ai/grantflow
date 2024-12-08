import { Factory } from "interface-forge";
import { UserInfo } from "@firebase/auth";
import { GrantApplication, GrantCfp, ResearchAim, ResearchTask, Workspace } from "@/types/api-types";
import { UserRole } from "@/constants";

export const UserInfoFactory = new Factory<UserInfo>((factory) => ({
	photoURL: factory.helpers.arrayElement([null, factory.image.avatar()]),
	email: factory.internet.email(),
	providerId: "google.com",
	displayName: factory.person.fullName(),
	phoneNumber: null,
	uid: factory.string.uuid(),
}));

export const WorkspaceFactory = new Factory<Workspace>((factory) => ({
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	logo_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	name: factory.lorem.sentence(),
	role: UserRole.Member,
}));

export const GrantApplicationFactory = new Factory<GrantApplication>((factory) => ({
	cfp_id: factory.string.uuid(),
	id: factory.string.uuid(),
	title: factory.lorem.words(),
	innovation: factory.lorem.paragraphs(),
	significance: factory.lorem.paragraphs(),
}));

export const GrantCFPFactory = new Factory<GrantCfp>((factory) => ({
	allow_clinical_trials: factory.datatype.boolean(),
	allow_resubmissions: factory.datatype.boolean(),
	funding_organization_id: factory.string.uuid(),
	funding_organization_name: "NIH",
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
	url: factory.helpers.arrayElement([null, factory.internet.url()]),
}));

export const ResearchAimFactory = new Factory<ResearchAim>((factory, i) => ({
	description: factory.lorem.sentence(),
	aim_number: i + 1,
	id: factory.string.uuid(),
	requires_clinical_trials: factory.datatype.boolean(),
	title: factory.lorem.words(),
	research_tasks: ResearchTaskFactory.batch(3),
}));

export const ResearchTaskFactory = new Factory<ResearchTask>((factory, i) => ({
	description: factory.lorem.sentence(),
	task_number: i + 1,
	id: factory.string.uuid(),
	title: factory.lorem.words(),
}));
