import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { WizardFooter } from "./wizard-wrapper-components";

const meta: Meta<typeof WizardFooter> = {
	component: WizardFooter,
	decorators: [
		(Story) => (
			<div className="min-h-screen bg-light flex flex-col">
				<div className="flex-1" />
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Wizard/WizardFooter",
};

export default meta;
type Story = StoryObj<typeof WizardFooter>;

export const FirstStepNoTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1: No Title - Next Button Disabled",
};

export const FirstStepTitleNoSources: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1: Title but No Sources - Next Button Disabled",
};

export const FirstStepValid: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "grant-guidelines.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
				];
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1: Valid - Next Button Enabled",
};

export const SecondStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
					isGeneratingTemplate: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 2: Application Structure - Approve and Continue",
};

export const SecondStepGenerating: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_STRUCTURE,
					isGeneratingTemplate: true,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 2: Generating Template - Back Button Disabled",
};

export const KnowledgeBaseStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 3: Knowledge Base - Standard Navigation",
};

export const ResearchPlanStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
					isAutofillLoading: {
						research_deep_dive: false,
						research_plan: false,
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 4: Research Plan - Standard",
};

export const ResearchPlanAutofilling: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
					isAutofillLoading: {
						research_deep_dive: false,
						research_plan: true,
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 4: Research Plan - Autofilling (Button Disabled)",
};

export const ResearchDeepDiveStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
					isAutofillLoading: {
						research_deep_dive: false,
						research_plan: false,
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 5: Research Deep Dive - Standard",
};

export const ResearchDeepDiveAutofilling: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_DEEP_DIVE,
					isAutofillLoading: {
						research_deep_dive: true,
						research_plan: false,
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 5: Research Deep Dive - Autofilling (Button Disabled)",
};

export const FinalStep: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
					isGeneratingApplication: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 6: Generate and Complete - Generate Button",
};

export const FinalStepGenerating: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.GENERATE_AND_COMPLETE,
					isGeneratingApplication: true,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 6: Generating Application - Button Disabled",
};

export const OperationsInProgress: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Climate Change Research Grant Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: true,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Operations In Progress - All Buttons Disabled",
};

export const MobileResponsive: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build();
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Mobile Test Application",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.RESEARCH_PLAN,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Mobile View - Responsive Buttons",
	parameters: {
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};

export const ShortTitleInvalid: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "grant-guidelines.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
				];
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "ABC",
				});
				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Step 1: Title Too Short - Next Button Disabled",
};
