import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FundingOrganizationFactory,
	OrganizationFactory,
	ProjectListItemFactory,
} from "::testing/factories";
import type { API } from "@/types/api-types";

export interface Scenario {
	data: {
		applications: Map<string, API.RetrieveApplication.Http200.ResponseBody>;
		fundingOrganizations: NonNullable<
			API.CreateApplication.Http201.ResponseBody["grant_template"]
		>["funding_organization"][];
		organizations: API.CreateOrganization.Http201.ResponseBody[];
		projects: API.ListProjects.Http200.ResponseBody;
	};
	description: string;
	name: string;
}

export const scenarios: Scenario[] = [
	{
		data: {
			applications: new Map(),
			fundingOrganizations: [],
			organizations: [],
			projects: [],
		},
		description: "Fresh account with no data",
		name: "empty",
	},
	{
		data: {
			applications: new Map([
				[
					"app-1",
					ApplicationFactory.build({
						grant_template: undefined,
						id: "app-1",
						status: "DRAFT",
						title: "Draft Grant Application",
					}),
				],
			]),
			fundingOrganizations: FundingOrganizationFactory.batch(3),
			organizations: OrganizationFactory.batch(1),
			projects: ProjectListItemFactory.batch(1, {
				applications_count: 1,
				name: "My Research Project",
			}),
		},
		description: "One project with a draft application",
		name: "minimal",
	},
	{
		data: {
			applications: new Map([
				[
					"app-1",
					ApplicationWithTemplateFactory.build({
						completed_at: new Date().toISOString(),
						id: "app-1",
						status: "COMPLETED",
						title: "NIH R01 Grant Application",
					}),
				],
				[
					"app-2",
					ApplicationWithTemplateFactory.build({
						id: "app-2",
						status: "IN_PROGRESS",
						title: "NSF CAREER Award",
					}),
				],
				[
					"app-3",
					ApplicationFactory.build({
						id: "app-3",
						status: "DRAFT",
						title: "ERC Starting Grant",
					}),
				],
			]),
			fundingOrganizations: FundingOrganizationFactory.batch(10),
			organizations: OrganizationFactory.batch(3),
			projects: [
				ProjectListItemFactory.build({
					applications_count: 3,
					name: "Cancer Research Initiative",
					role: "OWNER",
				}),
				ProjectListItemFactory.build({
					applications_count: 2,
					name: "AI Ethics Study",
					role: "ADMIN",
				}),
				ProjectListItemFactory.build({
					applications_count: 5,
					name: "Climate Change Analysis",
					role: "MEMBER",
				}),
			],
		},
		description: "Multiple projects with various application states",
		name: "full",
	},
	{
		data: {
			applications: new Map(),
			fundingOrganizations: [
				FundingOrganizationFactory.build({
					abbreviation: "NIH",
					full_name: "National Institutes of Health",
				}),
				FundingOrganizationFactory.build({
					abbreviation: "NSF",
					full_name: "National Science Foundation",
				}),
				FundingOrganizationFactory.build({
					abbreviation: "ERC",
					full_name: "European Research Council",
				}),
			],
			organizations: OrganizationFactory.batch(2),
			projects: [
				ProjectListItemFactory.build({
					applications_count: 0,
					id: "wizard-project",
					name: "Wizard Test Project",
				}),
			],
		},
		description: "Optimized for testing the grant wizard flow",
		name: "wizard-test",
	},
	{
		data: {
			applications: new Map([
				[
					"app-with-template",
					ApplicationWithTemplateFactory.build({
						grant_template: {
							...ApplicationWithTemplateFactory.build().grant_template!,
							rag_sources: [
								{
									filename: "research-proposal.pdf",
									sourceId: "src-1",
									status: "FINISHED",
								},
								{
									filename: "project-guidelines.docx",
									sourceId: "src-2",
									status: "FINISHED",
								},
								{
									filename: "application-requirements.txt",
									sourceId: "src-3",
									status: "FINISHED",
								},
								{
									sourceId: "src-4",
									status: "FINISHED",
									url: "https://grants.nih.gov/grants/guide/pa-files/PA-23-149.html",
								},
								{
									sourceId: "src-5",
									status: "FINISHED",
									url: "https://www.nsf.gov/publications/pub_summ.jsp?ods_key=nsf23609",
								},
								{
									sourceId: "src-6",
									status: "FINISHED",
									url: "https://erc.europa.eu/apply-erc-grant/starting-grants",
								},
								{
									sourceId: "src-7",
									status: "FINISHED",
									url: "https://example.org/very-long-url-that-should-be-truncated-in-the-ui-to-test-ellipsis-behavior",
								},
								{
									sourceId: "src-8",
									status: "FINISHED",
									url: "https://research.example.com/funding/opportunities/2024/advanced-research-grants",
								},
							],
						},
						id: "app-with-template",
						status: "DRAFT",
						title: "Grant Application with Template Sources",
					}),
				],
			]),
			fundingOrganizations: FundingOrganizationFactory.batch(3),
			organizations: OrganizationFactory.batch(1),
			projects: ProjectListItemFactory.batch(1, {
				applications_count: 1,
				name: "Research Project with Sources",
			}),
		},
		description: "Application with grant template containing multiple files and URLs for preview testing",
		name: "template-with-sources",
	},
	{
		data: {
			applications: new Map([
				[
					"app-error-1",
					ApplicationFactory.build({
						id: "app-error-1",
						rag_sources: [
							{
								filename: "corrupted.pdf",
								sourceId: "src-1",
								status: "FAILED",
							},
						],
						status: "CANCELLED",
						title: "Failed Processing",
					}),
				],
			]),
			fundingOrganizations: [],
			organizations: [],
			projects: [
				ProjectListItemFactory.build({
					applications_count: 2,
					name: "Project with Failed Applications",
				}),
			],
		},
		description: "Test error handling and edge cases",
		name: "error-states",
	},
];

export function getDefaultScenario(): Scenario {
	return scenarios.find((s) => s.name === "empty") ?? scenarios[0];
}

export function getScenario(name: string): Scenario | undefined {
	return scenarios.find((s) => s.name === name);
}
