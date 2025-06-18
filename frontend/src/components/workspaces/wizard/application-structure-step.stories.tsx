import { ApplicationStructureStep } from "./application-structure-step";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof ApplicationStructureStep> = {
	component: ApplicationStructureStep,
	decorators: [
		(Story) => (
			<div className="h-screen w-screen">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
		zustand: {
			application: {
				application: null,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			},
			wizard: {
				currentStep: 1,
				polling: {
					intervalId: null,
					isActive: false,
				},
			},
		},
	},
	title: "Components/Wizard/ApplicationStructureStep",
};

export default meta;
type Story = StoryObj<typeof ApplicationStructureStep>;

export const EmptyState: Story = {
	name: "Empty State - No Content",
	parameters: {
		zustand: {
			application: {
				application: null,
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			},
		},
	},
};

export const WithApplicationTitle: Story = {
	parameters: {
		zustand: {
			application: {
				application: {
					created_at: "2024-01-01T00:00:00Z",
					grant_template: {
						created_at: "2024-01-01T00:00:00Z",
						grant_application_id: "app-123",
						grant_sections: [],
						id: "template-456",
						rag_sources: [],
						updated_at: "2024-01-01T00:00:00Z",
					},
					id: "app-123",
					rag_sources: [],
					title: "Climate Change Research Grant",
					updated_at: "2024-01-01T00:00:00Z",
					workspace_id: "workspace-123",
				},
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			},
		},
	},
};

export const WithGeneratedSections: Story = {
	parameters: {
		zustand: {
			application: {
				application: {
					created_at: "2024-01-01T00:00:00Z",
					grant_template: {
						created_at: "2024-01-01T00:00:00Z",
						grant_application_id: "app-123",
						grant_sections: [
							{
								depends_on: [],
								generation_instructions: "Write an executive summary",
								id: "section-1",
								is_clinical_trial: false,
								is_detailed_workplan: false,
								keywords: ["summary", "overview"],
								max_words: 500,
								order: 1,
								parent_id: null,
								search_queries: ["executive summary"],
								title: "Executive Summary",
								topics: ["project overview"],
							},
							{
								depends_on: [],
								generation_instructions: "Write project description",
								id: "section-2",
								is_clinical_trial: false,
								is_detailed_workplan: false,
								keywords: ["project", "description"],
								max_words: 1000,
								order: 2,
								parent_id: null,
								search_queries: ["project description"],
								title: "Project Description",
								topics: ["project details"],
							},
							{
								depends_on: [],
								generation_instructions: "Write budget and timeline",
								id: "section-3",
								is_clinical_trial: false,
								is_detailed_workplan: false,
								keywords: ["budget", "timeline"],
								max_words: 750,
								order: 3,
								parent_id: null,
								search_queries: ["budget timeline"],
								title: "Budget & Timeline",
								topics: ["financial planning"],
							},
							{
								depends_on: [],
								generation_instructions: "Write team qualifications",
								id: "section-4",
								is_clinical_trial: false,
								is_detailed_workplan: false,
								keywords: ["team", "qualifications"],
								max_words: 600,
								order: 4,
								parent_id: null,
								search_queries: ["team qualifications"],
								title: "Team & Qualifications",
								topics: ["team expertise"],
							},
						],
						id: "template-456",
						rag_sources: [],
						updated_at: "2024-01-01T00:00:00Z",
					},
					id: "app-123",
					rag_sources: [],
					title: "Climate Change Research Grant",
					updated_at: "2024-01-01T00:00:00Z",
					workspace_id: "workspace-123",
				},
				isLoading: false,
				uploadedFiles: [],
				urls: [],
			},
		},
	},
};
