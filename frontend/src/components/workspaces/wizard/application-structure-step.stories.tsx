import { ApplicationStructureStep } from "./application-structure-step";

// eslint-disable-next-line storybook/no-renderer-packages
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
			store: {
				applicationState: {
					application: null,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				uiState: {},
				workspaceId: "test-workspace",
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
			store: {
				applicationState: {
					application: null,
					applicationId: null,
					applicationTitle: "",
					templateId: null,
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const WithApplicationTitle: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: undefined,
					wsConnectionStatusColor: undefined,
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const WithConnectionStatus: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: "Connected",
					wsConnectionStatusColor: "bg-green-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const ProcessingState: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: "Processing",
					wsConnectionStatusColor: "bg-yellow-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const ErrorState: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: "Error",
					wsConnectionStatusColor: "bg-red-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const LongApplicationTitle: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle:
						"Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development",
					templateId: "template-456",
					wsConnectionStatus: "Connected",
					wsConnectionStatusColor: "bg-green-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const WithGeneratedSections: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [
								{
									description: "Overview of the project and key highlights",
									id: "section-1",
									order: 1,
									title: "Executive Summary",
								},
								{
									description: "Detailed description of the proposed project",
									id: "section-2",
									order: 2,
									title: "Project Description",
								},
								{
									description: "Financial breakdown and project timeline",
									id: "section-3",
									order: 3,
									title: "Budget & Timeline",
								},
								{
									description: "Team members and their relevant experience",
									id: "section-4",
									order: 4,
									title: "Team & Qualifications",
								},
							],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: "Connected",
					wsConnectionStatusColor: "bg-green-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};

export const InteractiveDemo: Story = {
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: {
							grant_sections: [
								{
									description: "Overview of the project and key highlights",
									id: "section-1",
									order: 1,
									title: "Executive Summary",
								},
								{
									description: "Detailed description of the proposed project",
									id: "section-2",
									order: 2,
									title: "Project Description",
								},
							],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					wsConnectionStatus: "Connected",
					wsConnectionStatusColor: "bg-green-500",
				},
				contentState: {
					uploadedFiles: [],
					urls: [],
				},
			},
		},
	},
};
