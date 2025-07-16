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
				members: [
					{
						display_name: "Dr. Jane Smith",
						email: "jane.smith@university.edu",
						firebase_uid: "mock-user-owner",
						photo_url:
							"https://images.unsplash.com/photo-1494790108755-2616b9d5c333?w=150&h=150&fit=crop&crop=face",
						role: "OWNER" as const,
					},
					{
						display_name: "John Doe",
						email: "john.doe@university.edu",
						firebase_uid: "mock-user-admin",
						photo_url: null,
						role: "ADMIN" as const,
					},
				],
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
					members: [
						{
							display_name: "Dr. Sarah Johnson",
							email: "s.johnson@medcenter.edu",
							firebase_uid: "mock-user-1",
							photo_url:
								"https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
							role: "OWNER" as const,
						},
						{
							display_name: "Dr. Michael Chen",
							email: "m.chen@medcenter.edu",
							firebase_uid: "mock-user-2",
							photo_url:
								"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
							role: "ADMIN" as const,
						},
						{
							display_name: "Emily Rodriguez",
							email: "e.rodriguez@medcenter.edu",
							firebase_uid: "mock-user-3",
							photo_url: null,
							role: "MEMBER" as const,
						},
						{
							display_name: "Dr. David Kim",
							email: "d.kim@medcenter.edu",
							firebase_uid: "mock-user-4",
							photo_url:
								"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
							role: "ADMIN" as const,
						},
					],
					name: "Cancer Research Initiative",
					role: "OWNER",
				}),
				ProjectListItemFactory.build({
					applications_count: 2,
					members: [
						{
							display_name: "Prof. Lisa Anderson",
							email: "l.anderson@techuni.edu",
							firebase_uid: "mock-user-5",
							photo_url:
								"https://images.unsplash.com/photo-1494790108755-2616b9d5c333?w=150&h=150&fit=crop&crop=face",
							role: "OWNER" as const,
						},
						{
							display_name: "Alex Thompson",
							email: "a.thompson@techuni.edu",
							firebase_uid: "mock-user-6",
							photo_url: null,
							role: "ADMIN" as const,
						},
						{
							display_name: "Maria Garcia",
							email: "m.garcia@techuni.edu",
							firebase_uid: "mock-user-7",
							photo_url:
								"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
							role: "MEMBER" as const,
						},
					],
					name: "AI Ethics Study",
					role: "ADMIN",
				}),
				ProjectListItemFactory.build({
					applications_count: 5,
					members: [
						{
							display_name: "Dr. Robert Wilson",
							email: "r.wilson@climatelab.org",
							firebase_uid: "mock-user-8",
							photo_url:
								"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
							role: "OWNER" as const,
						},
						{
							display_name: "Current User",
							email: "test@example.com",
							firebase_uid: "mock-user-123",
							photo_url: null,
							role: "ADMIN" as const,
						},
						{
							display_name: "Dr. Jennifer Liu",
							email: "j.liu@climatelab.org",
							firebase_uid: "mock-user-9",
							photo_url:
								"https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
							role: "ADMIN" as const,
						},
					],
					name: "Climate Change Analysis",
					role: "ADMIN",
				}),
				ProjectListItemFactory.build({
					applications_count: 1,
					members: [
						{
							display_name: "Current User",
							email: "test@example.com",
							firebase_uid: "mock-user-123",
							photo_url: null,
							role: "OWNER" as const,
						},
						{
							display_name: "Sarah Martinez",
							email: "s.martinez@university.edu",
							firebase_uid: "mock-user-10",
							photo_url:
								"https://images.unsplash.com/photo-1587614382346-4ec70e388b28?w=150&h=150&fit=crop&crop=face",
							role: "MEMBER" as const,
						},
					],
					name: "My Personal Research",
					role: "OWNER",
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
					members: [
						{
							display_name: "Test User",
							email: "test@example.com",
							firebase_uid: "mock-user-123",
							photo_url: null,
							role: "OWNER" as const,
						},
						{
							display_name: "Research Assistant",
							email: "assistant@university.edu",
							firebase_uid: "mock-user-assistant",
							photo_url:
								"https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
							role: "MEMBER" as const,
						},
					],
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
						{
							display_name: "Dr. Amanda Foster",
							email: "a.foster@research.edu",
							firebase_uid: "mock-user-sources-1",
							photo_url:
								"https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
							role: "ADMIN" as const,
						},
						{
							display_name: "Kevin Zhang",
							email: "k.zhang@research.edu",
							firebase_uid: "mock-user-sources-2",
							photo_url: null,
							role: "MEMBER" as const,
						},
						{
							display_name: "Dr. Rachel Green",
							email: "r.green@research.edu",
							firebase_uid: "mock-user-sources-3",
							photo_url:
								"https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
							role: "MEMBER" as const,
						},
						{
							display_name: "Prof. James Mitchell",
							email: "j.mitchell@research.edu",
							firebase_uid: "mock-user-sources-4",
							photo_url:
								"https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
							role: "ADMIN" as const,
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
					members: [
						{
							display_name: "Error Test User",
							email: "test@example.com",
							firebase_uid: "mock-user-123",
							photo_url: null,
							role: "OWNER" as const,
						},
						{
							display_name: "Failed User",
							email: "failed@example.com",
							firebase_uid: "mock-user-failed",
							photo_url:
								"https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150&h=150&fit=crop&crop=face",
							role: "MEMBER" as const,
						},
					],
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
