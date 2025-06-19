import { useEffect } from "react";

import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	FileWithIdFactory,
	RagSourceFactory,
} from "::testing/factories";
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
	currentStep = "Application Details",
	hasApplication = true,
}: {
	applicationTitle?: string;
	currentStep?: string;
	hasApplication?: boolean;
}) {
	const stepComponents = {
		"Application Details": <ApplicationDetailsStep key="Application Details" />,
		"Application Structure": <ApplicationStructureStep key="Application Structure" />,
		"Generate and Complete": <GenerateCompleteStep key="Generate and Complete" />,
		"Knowledge Base": <KnowledgeBaseStep key="Knowledge Base" />,
		"Research Deep Dive": <ResearchDeepDiveStep key="Research Deep Dive" />,
		"Research Plan": <ResearchPlanStep key="Research Plan" />,
	} as const;

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
				{stepComponents[currentStep as keyof typeof stepComponents]}
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
		currentStep: "Application Details",
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
					currentStep: "Application Details",
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
		currentStep: "Application Details",
		hasApplication: false,
	},
	name: "Loading Application",
};

export const Step1_ApplicationDetails: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: "Application Details",
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
					currentStep: "Application Details",
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
		currentStep: "Application Structure",
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
					uploadedFiles: [FileWithIdFactory.build({ name: "research-proposal.pdf" })],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					currentStep: "Application Structure",
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
		currentStep: "Knowledge Base",
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
					uploadedFiles: [FileWithIdFactory.build({ name: "research-proposal.pdf" })],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					currentStep: "Knowledge Base",
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
		currentStep: "Research Plan",
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
					uploadedFiles: [FileWithIdFactory.build({ name: "research-proposal.pdf" })],
					urls: [],
				});
				useWizardStore.setState({
					currentStep: "Research Plan",
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
		currentStep: "Research Deep Dive",
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
					uploadedFiles: [FileWithIdFactory.build({ name: "research-proposal.pdf" })],
					urls: [],
				});
				useWizardStore.setState({
					currentStep: "Research Deep Dive",
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
		currentStep: "Generate and Complete",
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
						FileWithIdFactory.build({ name: "research-proposal.pdf" }),
						FileWithIdFactory.build({ name: "budget-template.xlsx" }),
					],
					urls: [],
				});
				useWizardStore.setState({
					currentStep: "Generate and Complete",
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
		currentStep: "Application Structure",
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
					currentStep: "Application Structure",
				});
			}, []);
			return <Story />;
		},
	],
};

export const ProcessingFiles: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: "Knowledge Base",
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
					uploadedFiles: [FileWithIdFactory.build({ name: "research-proposal.pdf" })],
					urls: ["https://example.com/research-data"],
				});
				useWizardStore.setState({
					currentStep: "Knowledge Base",
				});
			}, []);
			return <Story />;
		},
	],
};

export const ConnectionError: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: "Application Details",
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
					currentStep: "Application Details",
				});
			}, []);
			return <Story />;
		},
	],
};
