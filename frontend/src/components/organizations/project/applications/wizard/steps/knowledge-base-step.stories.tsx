import { ApplicationWithTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { KnowledgeBaseStep } from "./knowledge-base-step";

const meta: Meta<typeof KnowledgeBaseStep> = {
	component: KnowledgeBaseStep,
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
	title: "Wizard/Steps/KnowledgeBaseStep",
};

export default meta;
type Story = StoryObj<typeof KnowledgeBaseStep>;

export const EmptyState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithDocuments: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "research-proposal.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
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
	name: "With Documents Only",
};

export const WithUrls: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://example.com/research-paper",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
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
	name: "With URLs Only",
};

export const WithBothDocsAndUrls: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "research-proposal.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://example.com/research-paper",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Climate Change Research Grant",
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
	name: "With Both Documents and URLs",
};
