import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FundingOrganizationFactory,
	OrganizationFactory,
	ProjectListItemFactory,
} from "::testing/factories";
import { addDays, addWeeks, subDays } from "date-fns";
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
					ApplicationWithTemplateFactory.build({
						grant_template: {
							...ApplicationWithTemplateFactory.build().grant_template!,
							rag_sources: [
								{
									filename: "grant-guidelines.pdf",
									sourceId: "src-minimal-1",
									status: "FINISHED",
								},
							],
							submission_date: addWeeks(new Date(), 4).toISOString(),
						},
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
						grant_template: {
							...ApplicationWithTemplateFactory.build().grant_template!,
							submission_date: subDays(new Date(), 10).toISOString(),
						},
						id: "app-1",
						status: "GENERATING",
						title: "NIH R01 Grant Application",
					}),
				],
				[
					"app-2",
					ApplicationWithTemplateFactory.build({
						grant_template: {
							...ApplicationWithTemplateFactory.build().grant_template!,
							submission_date: addDays(new Date(), 5).toISOString(),
						},
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
					"550e8400-e29b-41d4-a716-446655440001",
					{
						completed_at: null,
						created_at: new Date().toISOString(),
						form_inputs: null,
						grant_template: {
							created_at: new Date().toISOString(),
							funding_organization: FundingOrganizationFactory.build(),
							grant_sections: [],
							id: "550e8400-e29b-41d4-a716-446655440002",
							rag_sources: [
								{
									filename: "research-proposal.pdf",
									sourceId: "src-1",
									status: "FINISHED" as const,
								},
								{
									filename: "project-guidelines.docx",
									sourceId: "src-2",
									status: "FINISHED" as const,
								},
								{
									filename: "application-requirements.txt",
									sourceId: "src-3",
									status: "FINISHED" as const,
								},
								{
									sourceId: "src-4",
									status: "FINISHED" as const,
									url: "https://grants.nih.gov/grants/guide/pa-files/PA-23-149.html",
								},
								{
									sourceId: "src-5",
									status: "FINISHED" as const,
									url: "https://www.nsf.gov/publications/pub_summ.jsp?ods_key=nsf23609",
								},
								{
									sourceId: "src-6",
									status: "FINISHED" as const,
									url: "https://erc.europa.eu/apply-erc-grant/starting-grants",
								},
								{
									sourceId: "src-7",
									status: "FINISHED" as const,
									url: "https://example.org/very-long-url-that-should-be-truncated-in-the-ui-to-test-ellipsis-behavior",
								},
								{
									sourceId: "src-8",
									status: "FINISHED" as const,
									url: "https://research.example.com/funding/opportunities/2024/advanced-research-grants",
								},
							],
							status: "DRAFT" as const,
							submission_date: addWeeks(new Date(), 8).toISOString(),
							title: "Grant Template",
							updated_at: new Date().toISOString(),
						},
						id: "550e8400-e29b-41d4-a716-446655440001",
						project_id: "550e8400-e29b-41d4-a716-446655440000",
						rag_job_id: null,
						rag_sources: [],
						research_objectives: [],
						status: "DRAFT" as const,
						text: null,
						title: "Grant Application with Template Sources",
						updated_at: new Date().toISOString(),
					},
				],
			]),
			fundingOrganizations: FundingOrganizationFactory.batch(3),
			organizations: OrganizationFactory.batch(1),
			projects: [
				{
					applications_count: 1,
					description: "Test project description",
					id: "550e8400-e29b-41d4-a716-446655440000",
					logo_url: null,
					members: [
						{
							display_name: "Test User",
							email: "test@example.com",
							firebase_uid: "mock-user-123",
							photo_url: null,
							role: "OWNER" as const,
						},
					],
					name: "Research Project with Sources",
					role: "OWNER" as const,
				},
			],
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
