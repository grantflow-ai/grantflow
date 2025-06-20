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
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import type { Meta, StoryObj } from "@storybook/react";

const stepComponents = {
	[WizardStep.APPLICATION_DETAILS]: <ApplicationDetailsStep key={WizardStep.APPLICATION_DETAILS} />,
	[WizardStep.APPLICATION_STRUCTURE]: <ApplicationStructureStep key={WizardStep.APPLICATION_STRUCTURE} />,
	[WizardStep.GENERATE_AND_COMPLETE]: <GenerateCompleteStep key={WizardStep.GENERATE_AND_COMPLETE} />,
	[WizardStep.KNOWLEDGE_BASE]: <KnowledgeBaseStep key={WizardStep.KNOWLEDGE_BASE} />,
	[WizardStep.RESEARCH_DEEP_DIVE]: <ResearchDeepDiveStep key={WizardStep.RESEARCH_DEEP_DIVE} />,
	[WizardStep.RESEARCH_PLAN]: <ResearchPlanStep key={WizardStep.RESEARCH_PLAN} />,
} as const;

function WizardPage({
	currentStep = WizardStep.APPLICATION_DETAILS,
	hasApplication = true,
}: {
	applicationTitle?: string;
	currentStep?: string;
	hasApplication?: boolean;
}) {
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
		currentStep: WizardStep.APPLICATION_DETAILS,
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
					currentStep: WizardStep.APPLICATION_DETAILS,
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
		currentStep: WizardStep.APPLICATION_DETAILS,
		hasApplication: false,
	},
	name: "Loading Application",
};

export const Step1_ApplicationDetails: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: WizardStep.APPLICATION_DETAILS,
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
					currentStep: WizardStep.APPLICATION_DETAILS,
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
		currentStep: WizardStep.APPLICATION_STRUCTURE,
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
					currentStep: WizardStep.APPLICATION_STRUCTURE,
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
		currentStep: WizardStep.KNOWLEDGE_BASE,
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
					currentStep: WizardStep.KNOWLEDGE_BASE,
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
		currentStep: WizardStep.RESEARCH_PLAN,
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
					currentStep: WizardStep.RESEARCH_PLAN,
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
		currentStep: WizardStep.RESEARCH_DEEP_DIVE,
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
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
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
		currentStep: WizardStep.GENERATE_AND_COMPLETE,
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
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
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
		currentStep: WizardStep.APPLICATION_STRUCTURE,
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
					currentStep: WizardStep.APPLICATION_STRUCTURE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const ProcessingFiles: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: WizardStep.KNOWLEDGE_BASE,
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
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const ConnectionError: Story = {
	args: {
		applicationTitle: "Climate Change Research Grant",
		currentStep: WizardStep.APPLICATION_DETAILS,
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
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
};
