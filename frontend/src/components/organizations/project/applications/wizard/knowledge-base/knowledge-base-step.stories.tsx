import { ApplicationWithTemplateFactory, FileWithIdFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { KnowledgeBaseStep } from "./knowledge-base-step";

const buildApplication = (overrides?: Partial<API.CreateApplication.Http201.ResponseBody>) =>
	ApplicationWithTemplateFactory.build(overrides);

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
				const { reset } = useApplicationStore.getState();
				reset();

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
				const { reset } = useApplicationStore.getState();
				reset();

				const ragSources = [
					RagSourceFactory.build({
						filename: "research-proposal.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
				];

				const application = buildApplication({
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
				const { reset } = useApplicationStore.getState();
				reset();

				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://example.com/research-paper",
					}),
				];

				const application = buildApplication({
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
				const { reset } = useApplicationStore.getState();
				reset();

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

				const application = buildApplication({
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

export const PendingFileUploads: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "3",
						status: "FINISHED",
						url: "https://example.com/funding-database",
					}),
				];

				const application = buildApplication({
					rag_sources: ragSources,
					title: "Research Project with Pending Files",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "methodology-paper.pdf" }), "application");
				addPendingUpload(FileWithIdFactory.build({ name: "data-analysis.xlsx" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending File Uploads - Mixed Status",
};

export const AllPendingFiles: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = buildApplication({
					rag_sources: [],
					title: "All Pending Knowledge Base Files",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "literature-review.pdf" }), "application");
				addPendingUpload(FileWithIdFactory.build({ name: "experimental-design.docx" }), "application");
				addPendingUpload(FileWithIdFactory.build({ name: "preliminary-results.pptx" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
};

export const PendingWithProcessingStates: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "processing-file.docx",
						sourceId: "2",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "completed-file.txt",
						sourceId: "3",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "failed-file.pdf",
						sourceId: "4",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						sourceId: "5",
						status: "FINISHED",
						url: "https://example.com/external-resource",
					}),
				];

				const application = buildApplication({
					rag_sources: ragSources,
					title: "Mixed Processing States in Knowledge Base",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "pending-upload.pdf" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending with All Processing States",
};

export const PendingLargeDocuments: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = buildApplication({
					rag_sources: [],
					title: "Pending Large Knowledge Base Documents",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(
					FileWithIdFactory.build({
						name: "comprehensive-research-methodology-and-theoretical-framework.pdf",
					}),
					"application",
				);
				addPendingUpload(
					FileWithIdFactory.build({
						name: "extensive-literature-review-with-systematic-analysis-approach.docx",
					}),
					"application",
				);
				addPendingUpload(
					FileWithIdFactory.build({
						name: "detailed-experimental-procedures-and-data-collection-protocols.xlsx",
					}),
					"application",
				);

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending Large Documents - Name Truncation",
};

export const EmptyWithPendingAddition: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = buildApplication({
					rag_sources: [],
					title: "First Knowledge Base Upload",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "first-knowledge-base-document.pdf" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Single Pending File - First Upload",
};

export const LoadingKnowledgeBase: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: true,
				});
				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Loading State - Operations in Progress",
};

export const ErroredUploadsWithRetry: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "corrupted-research.pdf",
						sourceId: "1",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						filename: "network-timeout.docx",
						sourceId: "2",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						sourceId: "4",
						status: "FAILED",
						url: "https://inaccessible-site.example.com/research-data",
					}),
				];

				const application = buildApplication({
					rag_sources: ragSources,
					title: "Error Recovery in Knowledge Base",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "retry-upload.xlsx" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Error States - Failed with Retry Options",
};

export const MixedKnowledgeBaseFormats: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "data-analysis.csv",
						sourceId: "2",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "methodology.docx",
						sourceId: "3",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "presentation.pptx",
						sourceId: "4",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						sourceId: "6",
						status: "FINISHED",
						url: "https://journal.example.com/article/123",
					}),
				];

				const application = buildApplication({
					rag_sources: ragSources,
					title: "Mixed Knowledge Base Formats and States",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "research-paper.pdf" }), "application");
				addPendingUpload(FileWithIdFactory.build({ name: "notes.txt" }), "application");

				useWizardStore.setState({
					currentStep: WizardStep.KNOWLEDGE_BASE,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Mixed Formats - All File Types and States",
};
