import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationDetailsStep } from "./application-details-step";

const meta: Meta<typeof ApplicationDetailsStep> = {
	component: ApplicationDetailsStep,
	decorators: [
		(Story) => (
			<div className="h-screen w-screen">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Components/Wizard/ApplicationDetailsStep",
};

export default meta;
type Story = StoryObj<typeof ApplicationDetailsStep>;

export const EmptyState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});
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
	name: "Empty State - No Title or Documents",
};

export const WithTitle: Story = {
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
	name: "With Application Title",
};

export const WithDocuments: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "call-for-proposals.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "application-guidelines.docx",
						sourceId: "2",
						status: "INDEXING",
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
};

export const WithUrls: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://example.com/funding-guidelines",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://grants.gov/application-requirements",
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
	name: "With URLs",
};

export const WithAllContent: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "call-for-proposals.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "application-guidelines.docx",
						sourceId: "2",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						sourceId: "3",
						status: "FINISHED",
						url: "https://example.com/funding-guidelines",
					}),
					RagSourceFactory.build({
						sourceId: "4",
						status: "FAILED",
						url: "https://grants.gov/application-requirements",
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
	name: "Complete with Title, Documents and URLs",
};

export const WithConnectionStatus: Story = {
	args: {
		connectionStatus: "Connected",
		connectionStatusColor: "green",
	},
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
};

export const ProcessingState: Story = {
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
					areAppOperationsInProgress: true,
				});
				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
};
