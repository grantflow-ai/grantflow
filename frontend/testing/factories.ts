import { API } from "@/types/api-types";
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

export const WorkspaceFactory = new Factory<API.GetWorkspace.Http200.ResponseBody>((factory) => ({
	description: factory.helpers.arrayElement([null, factory.lorem.sentence()]),
	grant_applications: GrantApplicationFactory.batch(3),
	id: factory.string.uuid(),
	logo_url: factory.helpers.arrayElement([null, factory.image.avatar()]),
	name: factory.lorem.sentence(),
	role: factory.helpers.arrayElement(["MEMBER", "ADMIN", "OWNER"]),
}));

const ApplicationDetailsFactory = new Factory<Record<string, string>>((factory) => ({
	background_context: factory.lorem.paragraphs(),
	hypothesis: factory.lorem.paragraph(),
	impact: factory.lorem.paragraphs(),
	milestones_and_timeline: factory.lorem.paragraphs(),
	novelty_and_innovation: factory.lorem.paragraphs(),
	preliminary_data: factory.lorem.paragraphs(),
	rationale: factory.lorem.paragraphs(),
	research_feasibility: factory.lorem.paragraphs(),
	risks_and_mitigations: factory.lorem.paragraphs(),
	scientific_infrastructure: factory.lorem.paragraphs(),
	team_excellence: factory.lorem.paragraphs(),
}));

export const GrantApplicationFactory = new Factory<API.GetApplication.Http200.ResponseBody>((factory) => ({
	completed_at: factory.helpers.arrayElement([null, factory.date.recent().toISOString()]),
	details: ApplicationDetailsFactory.build(),
	grant_template: null,
	id: factory.string.uuid(),
	research_objectives: ResearchObjectiveFactory.batch(3),
	text: factory.helpers.arrayElement([null, factory.lorem.paragraphs()]),
	title: factory.lorem.sentence(),
	workspace_id: factory.string.uuid(),
	form_inputs: ApplicationDetailsFactory.build(),
}));

export const ResearchTaskFactory = new Factory<{
	description?: string;
	number: number;
	relationships?: string[];
	title: string;
}>((factory, i) => ({
	description: factory.helpers.maybe(() => factory.lorem.sentence()),
	number: i + 1,
	relationships: factory.helpers.maybe(() => factory.lorem.words().split(" ")),
	title: factory.lorem.words(),
}));

export const ResearchObjectiveFactory = new Factory<{
	description?: string;
	number: number;
	relationships?: string[];
	research_tasks: {
		description?: string;
		number: number;
		relationships?: string[];
		title: string;
	}[];
	title: string;
}>((factory, i) => ({
	description: factory.helpers.maybe(() => factory.lorem.sentence()),
	number: i + 1,
	relationships: factory.helpers.maybe(() => factory.lorem.words().split(" ")),
	research_tasks: ResearchTaskFactory.batch(3),
	title: factory.lorem.words(),
}));
