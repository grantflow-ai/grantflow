import { UserRole } from "@/constants";
import { Application, GrantCfp, ResearchAim, ResearchTask, Workspace } from "@/types/api-types";
import { UserInfo } from "firebase/auth";
import { Factory } from "interface-forge";

export const UserInfoFactory = new Factory<UserInfo>((factory) => ({
	displayName: factory.person.fullName(),
	email: factory.internet.email(),
	phoneNumber: null,
	photoURL: factory.helpers.arrayElement([null, factory.image.avatar()]),
	providerId: "google.com",
	uid: factory.string.uuid(),
}));

export const WorkspaceFactory = new Factory<Workspace>((factory) => ({
	applications: ApplicationFactory.batch(3),
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	logo_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	name: factory.lorem.sentence(),
	role: UserRole.Member,
}));

export const ApplicationFactory = new Factory<Application>((factory) => ({
	cfp: factory.use(GrantCFPFactory.build),
	files: [],
	id: factory.string.uuid(),
	innovation: factory.lorem.paragraphs(),
	research_aims: factory.use(ResearchAimFactory.batch, 3),
	significance: factory.lorem.paragraphs(),
	text: factory.lorem.paragraphs(),
	title: factory.lorem.words(),
}));

export const GrantCFPFactory = new Factory<GrantCfp>((factory) => ({
	allow_clinical_trials: factory.datatype.boolean(),
	allow_resubmissions: factory.datatype.boolean(),
	category: factory.lorem.words(),
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
	description: factory.lorem.sentence(),
	funding_organization_id: factory.string.uuid(),
	funding_organization_name: "NIH",
	id: factory.string.uuid(),
	title: factory.lorem.words(),
	url: factory.helpers.arrayElement([null, factory.internet.url()]),
}));

export const ResearchAimFactory = new Factory<ResearchAim>((factory, i) => ({
	aim_number: i + 1,
	description: factory.lorem.sentence(),
	id: factory.string.uuid(),
	preliminary_results: factory.lorem.sentences(8),
	requires_clinical_trials: factory.datatype.boolean(),
	research_tasks: ResearchTaskFactory.batch(3),
	risks_and_alternatives: factory.lorem.sentences(3),
	title: factory.lorem.words(),
}));

export const ResearchTaskFactory = new Factory<ResearchTask>((factory, i) => ({
	description: factory.lorem.sentence(),
	id: factory.string.uuid(),
	task_number: i + 1,
	title: factory.lorem.words(),
}));
