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
	image: factory.helpers.arrayElement([null, factory.image.avatar()]),
	createdAt: new Date(),
	email: factory.internet.email(),
	emailVerified: new Date(),
	name: factory.person.fullName(),
	id: factory.string.uuid(),
	updatedAt: new Date(),
}));

export const WorkspaceFactory = new Factory<Workspace>((factory) => ({
	createdAt: new Date(),
	deletedAt: null,
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	id: factory.string.uuid(),
	logoUrl: "https://via.placeholder.com/150?text=Logo+3",
	name: factory.lorem.sentence(),
	updatedAt: new Date(),
}));

export const GrantApplicationFactory = new Factory<GrantApplication>((factory) => ({
	cfpId: factory.string.uuid(),
	createdAt: new Date(),
	deletedAt: null,
	id: factory.string.uuid(),
	isResubmission: factory.datatype.boolean(),
	title: factory.lorem.words(),
	innovation: factory.lorem.paragraphs(),
	significance: factory.lorem.paragraphs(),
	updatedAt: new Date(),
	workspaceId: factory.string.uuid(),
}));

export const GrantCFPFactory = new Factory<GrantCFP>((factory) => ({
	allowClinicalTrials: factory.datatype.boolean(),
	allowResubmissions: factory.datatype.boolean(),
	createdAt: new Date(),
	deletedAt: null,
	fundingOrganizationId: factory.string.uuid(),
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
	updatedAt: new Date(),
	url: factory.helpers.arrayElement([null, factory.internet.url()]),
}));

export const FundingOrganizationFactory = new Factory<FundingOrganization>((factory) => ({
	createdAt: new Date(),
	deletedAt: null,
	id: factory.string.uuid(),
	logoUrl: "https://via.placeholder.com/150?text=Logo+3",
	name: factory.company.name(),
	updatedAt: new Date(),
}));

export const ResearchAimFactory = new Factory<ResearchAim>((factory) => ({
	createdAt: new Date(),
	deletedAt: null,
	description: factory.lorem.sentence(),
	draftId: factory.string.uuid(),
	fileUrls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	requiredClinicalTrials: factory.datatype.boolean(),
	applicationId: factory.string.uuid(),
	title: factory.lorem.words(),
	updatedAt: new Date(),
}));

export const ResearchTaskFactory = new Factory<ResearchTask>((factory) => ({
	createdAt: new Date(),
	deletedAt: null,
	description: factory.lorem.sentence(),
	fileUrls: factory.helpers.arrayElement([null, [factory.image.url()]]),
	id: factory.string.uuid(),
	aimId: factory.string.uuid(),
	title: factory.lorem.words(),
	updatedAt: new Date(),
}));
