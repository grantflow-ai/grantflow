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
	title: "Components/Wizard/KnowledgeBaseStep",
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
	name: "Empty State - No Content",
};

export const WithApplicationTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [],
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
	name: "With Application Title Only",
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
					RagSourceFactory.build({
						filename: "preliminary-data.docx",
						sourceId: "2",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "team-bios.pdf",
						sourceId: "3",
						status: "INDEXING",
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
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://university.edu/team-profile",
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
};

export const WithDocumentsAndUrls: Story = {
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
						filename: "preliminary-data.docx",
						sourceId: "2",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						sourceId: "3",
						status: "FINISHED",
						url: "https://example.com/research-paper",
					}),
					RagSourceFactory.build({
						sourceId: "4",
						status: "FAILED",
						url: "https://university.edu/team-profile",
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
	name: "With Documents and URLs",
};

export const ManyDocuments: Story = {
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
						filename: "preliminary-data.docx",
						sourceId: "2",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "team-bios.pdf",
						sourceId: "3",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "budget-spreadsheet.xlsx",
						sourceId: "4",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "references.txt",
						sourceId: "5",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						filename: "methodology-notes.docx",
						sourceId: "6",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "ethical-approval.pdf",
						sourceId: "7",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "collaboration-agreements.pdf",
						sourceId: "8",
						status: "INDEXING",
					}),
				];

				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
					title: "Large Scale Climate Research Initiative",
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
};
