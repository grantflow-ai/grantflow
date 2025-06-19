import React, { useEffect } from "react";

import { ApplicationFactory, ApplicationWithTemplateFactory, RagSourceFactory } from "::testing/factories";
import {
	ApplicationDetailsStep,
	ApplicationStructureStep,
	GenerateCompleteStep,
	KnowledgeBaseStep,
	ResearchDeepDiveStep,
	ResearchPlanStep,
} from "@/components/workspaces/wizard";
import { WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import type { Meta, StoryObj } from "@storybook/react";

function WizardPage({
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

const meta: Meta<typeof WizardPage> = {
	component: WizardPage,
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
type Story = StoryObj<typeof WizardPage>;

export const Default: Story = {
	args: {
		applicationTitle: "Untitled Application",
		currentStep: 0,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationFactory.build({
					grant_template: undefined,
					title: "Untitled Application",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 0, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Default - Step 1 (Application Details)",
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
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationFactory.build({
					grant_template: undefined,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 0, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1 - Application Details",
};

export const Step2_ApplicationStructure: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 1,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
					],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					ui: { currentStep: 1, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 2 - Application Structure",
};

export const Step3_KnowledgeBase: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 2,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						status: "FINISHED",
					}),
				];
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
					],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					ui: { currentStep: 2, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 3 - Knowledge Base",
};

export const Step4_ResearchPlan: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 3,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						status: "FINISHED",
					}),
				];
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
					],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 3, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 4 - Research Plan",
};

export const Step5_ResearchDeepDive: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 4,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						status: "FINISHED",
					}),
				];
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
					],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 4, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 5 - Research Deep Dive",
};

export const Step6_GenerateComplete: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 5,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						status: "FINISHED",
					}),
				];
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
						Object.assign(
							new File(["content"], "budget-template.xlsx", {
								type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
							}),
							{
								id: "file-2",
							},
						),
					],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 5, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 6 - Generate & Complete",
};

export const LongApplicationTitle: Story = {
	args: {
		applicationTitle:
			"Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development and Renewable Energy Solutions",
		currentStep: 1,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					grant_template: {
						...ApplicationWithTemplateFactory.build().grant_template!,
						grant_sections: [],
					},
					title: "Comprehensive Climate Change Research and Environmental Impact Assessment Grant for Sustainable Development and Renewable Energy Solutions",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 1, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
};

export const ProcessingFiles: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 2,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						status: "INDEXING",
					}),
				];
				const application = ApplicationFactory.build({
					grant_template: undefined,
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [
						Object.assign(new File(["content"], "research-proposal.pdf", { type: "application/pdf" }), {
							id: "file-1",
						}),
					],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					ui: { currentStep: 2, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
};

export const ConnectionError: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: 0,
		hasApplication: true,
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationFactory.build({
					grant_template: undefined,
					title: "Climate Change Research Grant",
				});
				useApplicationStore.setState({
					application,
					isLoading: false,
					uploadedFiles: [],
					urls: [],
				});
				useWizardStore.setState({
					ui: { currentStep: 0, fileDropdownStates: {}, linkHoverStates: {}, urlInput: "" },
				});
			}, []);
			return <Story />;
		},
	],
};
