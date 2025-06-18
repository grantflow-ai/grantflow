import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import {
	ApplicationDetailsStep,
	ApplicationStructureStep,
	GenerateCompleteStep,
	KnowledgeBaseStep,
	ResearchDeepDiveStep,
	ResearchPlanStep,
} from "@/components/workspaces/wizard";
import { WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";

// Completely static wizard page for Storybook that doesn't depend on zustand
function StaticWizardPage({
	currentStep = 0,
	hasApplication = true,
}: {
	applicationTitle?: string;
	currentStep?: number;
	hasApplication?: boolean;
}) {
	const steps = [
		<ApplicationDetailsStep key={0} />,
		<ApplicationStructureStep key={1} />,
		<KnowledgeBaseStep key={2} />,
		<ResearchPlanStep key={3} />,
		<ResearchDeepDiveStep key={4} />,
		<GenerateCompleteStep key={5} />,
	];

	if (!hasApplication) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Loading application...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-light flex h-screen w-screen flex-col" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{steps[currentStep]}
			</section>
			<WizardFooter />
		</div>
	);
}

const meta: Meta<typeof StaticWizardPage> = {
	component: StaticWizardPage,
	decorators: [
		(Story) => (
			<div className="h-screen w-screen">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
		nextjs: {
			appDirectory: true,
		},
	},
	title: "Pages/Workspaces/Applications/CreateWizard",
};

export default meta;
type Story = StoryObj<typeof StaticWizardPage>;

export const Default: Story = {
	args: {
		applicationTitle: "Untitled Application",
		currentStep: 0,
		hasApplication: true,
	},
	name: "Default - Step 1 (Application Details)",
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: null,
						id: "app-123",
						rag_sources: [],
						title: "Untitled Application",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Untitled Application",
					templateId: null,
					uploadedFiles: [],
					urls: [],
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => false,
			},
		},
	},
};

export const LoadingState: Story = {
	args: {
		applicationTitle: "",
		currentStep: 0,
		hasApplication: false,
	},
	name: "Loading Application",
};

export const Step1_ApplicationDetails: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 0,
		hasApplication: true,
	},
	name: "Step 1 - Application Details",
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: null,
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: null,
					uploadedFiles: [],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

export const Step2_ApplicationStructure: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 1,
		hasApplication: true,
	},
	name: "Step 2 - Application Structure",
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
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
					],
					urls: ["https://example.com/research-data"],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

export const Step3_KnowledgeBase: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 2,
		hasApplication: true,
	},
	name: "Step 3 - Knowledge Base",
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
							],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [
							{
								id: "source-1",
								identifier: "research-proposal.pdf",
								indexing_status: "FINISHED",
								type: "FILE",
							},
							{
								id: "source-2",
								identifier: "https://example.com/research-data",
								indexing_status: "FINISHED",
								type: "URL",
							},
						],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
					],
					urls: ["https://example.com/research-data"],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

export const Step4_ResearchPlan: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 3,
		hasApplication: true,
	},
	name: "Step 4 - Research Plan",
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
						rag_sources: [
							{
								id: "source-1",
								identifier: "research-proposal.pdf",
								indexing_status: "FINISHED",
								type: "FILE",
							},
						],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
					],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 3,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

export const Step5_ResearchDeepDive: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 4,
		hasApplication: true,
	},
	name: "Step 5 - Research Deep Dive",
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
							],
							id: "template-456",
						},
						id: "app-123",
						rag_sources: [
							{
								id: "source-1",
								identifier: "research-proposal.pdf",
								indexing_status: "FINISHED",
								type: "FILE",
							},
						],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
					],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 4,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

export const Step6_GenerateComplete: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 5,
		hasApplication: true,
	},
	name: "Step 6 - Generate & Complete",
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
						rag_sources: [
							{
								id: "source-1",
								identifier: "research-proposal.pdf",
								indexing_status: "FINISHED",
								type: "FILE",
							},
							{
								id: "source-2",
								identifier: "budget-template.xlsx",
								indexing_status: "FINISHED",
								type: "FILE",
							},
						],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: "template-456",
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
						{
							file: { name: "budget-template.xlsx", size: 512_000 },
							id: "file-2",
						},
					],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 5,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => true,
			},
		},
	},
};

// Edge cases and error states
export const LongApplicationTitle: Story = {
	args: {
		applicationTitle:
			"Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development and Renewable Energy Solutions",
		currentStep: 1,
		hasApplication: true,
	},
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
						title: "Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development and Renewable Energy Solutions",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle:
						"Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development and Renewable Energy Solutions",
					templateId: "template-456",
					uploadedFiles: [],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 1,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => false,
			},
		},
	},
};

export const ProcessingFiles: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 2,
		hasApplication: true,
	},
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: null,
						id: "app-123",
						rag_sources: [
							{
								id: "source-1",
								identifier: "research-proposal.pdf",
								indexing_status: "INDEXING",
								type: "FILE",
							},
							{
								id: "source-2",
								identifier: "https://example.com/research-data",
								indexing_status: "PENDING",
								type: "URL",
							},
						],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: null,
					uploadedFiles: [
						{
							file: { name: "research-proposal.pdf", size: 1_024_000 },
							id: "file-1",
						},
					],
					urls: ["https://example.com/research-data"],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: true,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 2,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => false,
			},
		},
	},
};

export const ConnectionError: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 0,
		hasApplication: true,
	},
	parameters: {
		zustand: {
			store: {
				applicationState: {
					application: {
						grant_template: null,
						id: "app-123",
						rag_sources: [],
						title: "Climate Change Research Grant",
						workspace_id: "workspace-123",
					},
					applicationId: "app-123",
					applicationTitle: "Climate Change Research Grant",
					templateId: null,
					uploadedFiles: [],
					urls: [],
					workspaceId: "workspace-123",
				},
				handleApplicationInit: () => Promise.resolve(),
				isLoading: false,
				polling: {
					intervalId: null,
					isActive: false,
					start: () => undefined,
					stop: () => undefined,
				},
				toNextStep: () => undefined,
				toPreviousStep: () => undefined,
				ui: {
					currentStep: 0,
					fileDropdownStates: {},
					linkHoverStates: {},
					urlInput: "",
				},
				validateStepNext: () => false,
			},
		},
	},
};
