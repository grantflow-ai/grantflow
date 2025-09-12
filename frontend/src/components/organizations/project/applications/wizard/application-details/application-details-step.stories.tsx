import {
	ApplicationWithTemplateFactory,
	FileWithIdFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { ApplicationDetailsStep } from "./application-details-step";

const meta: Meta<typeof ApplicationDetailsStep> = {
	component: ApplicationDetailsStep,
	decorators: [
		(Story) => (
			<div className="h-screen w-screen bg-light">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "fullscreen",
	},
	title: "Wizard/Steps/ApplicationDetailsStep",
};

export default meta;
type Story = StoryObj<typeof ApplicationDetailsStep>;

export const EmptyState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const { reset } = useApplicationStore.getState();
				reset();

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
				const { reset } = useApplicationStore.getState();
				reset();

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

export const OnlyDocuments: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const { reset } = useApplicationStore.getState();
				reset();

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
	name: "Only Documents - Title and Documents",
};

export const OnlyUrls: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const { reset } = useApplicationStore.getState();
				reset();

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
	name: "Only URLs - Title and URLs",
};

export const WithAllContent: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const { reset } = useApplicationStore.getState();
				reset();

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

export const NoTitleWithDocuments: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const { reset } = useApplicationStore.getState();
				reset();

				const ragSources = [
					RagSourceFactory.build({
						filename: "call-for-proposals.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://example.com/funding-guidelines",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
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
	name: "No Title but with Documents and URLs",
};

export const PendingUploads: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "3",
						status: "FINISHED",
						url: "https://example.com/funding-guidelines",
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

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "research-proposal.pdf" }), "template");
				addPendingUpload(FileWithIdFactory.build({ name: "budget-breakdown.xlsx" }), "template");

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending File Uploads - Mixed Status",
};

export const AllPendingUploads: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Research Grant Application with All Pending Files",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "application-form.pdf" }), "template");
				addPendingUpload(FileWithIdFactory.build({ name: "supporting-documents.docx" }), "template");
				addPendingUpload(FileWithIdFactory.build({ name: "financial-data.xlsx" }), "template");

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "All Pending File Uploads",
};

export const PendingWithProcessing: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "guidelines.docx",
						sourceId: "2",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "completed-doc.pdf",
						sourceId: "3",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "failed-upload.txt",
						sourceId: "4",
						status: "FAILED",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "All Status Types with Pending Files",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "requirements.pdf" }), "template");

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending with All Processing States",
};

export const PendingLargeFiles: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Pending Large Files with Long Names",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(
					FileWithIdFactory.build({
						name: "large-research-dataset-with-extensive-methodology-and-findings.pdf",
					}),
					"template",
				);
				addPendingUpload(
					FileWithIdFactory.build({ name: "comprehensive-budget-analysis-and-financial-projections.xlsx" }),
					"template",
				);
				addPendingUpload(
					FileWithIdFactory.build({ name: "detailed-project-timeline-and-milestone-documentation.docx" }),
					"template",
				);

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Pending Large Files - Name Truncation",
};

export const LoadingState: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: [],
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Loading Application Data",
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
	name: "Loading State - Operations in Progress",
};

export const ErrorStatesWithRetry: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "corrupted-file.pdf",
						sourceId: "1",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						filename: "timeout-file.docx",
						sourceId: "2",
						status: "FAILED",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Error Recovery and Retry Scenarios",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "retry-pending.xlsx" }), "template");

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Error States - Failed with Retry",
};

export const MixedFileTypes: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "presentation.pptx",
						sourceId: "3",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "notes.txt",
						sourceId: "4",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "image.png",
						sourceId: "5",
						status: "FAILED",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Mixed File Types and Statuses",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});

				const { addPendingUpload } = useApplicationStore.getState();
				addPendingUpload(FileWithIdFactory.build({ name: "proposal.pdf" }), "template");
				addPendingUpload(FileWithIdFactory.build({ name: "spreadsheet.xlsx" }), "template");

				useWizardStore.setState({
					currentStep: WizardStep.APPLICATION_DETAILS,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Mixed File Types - All Formats",
};

export const LargeDatasetsWithTruncation: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					...Array.from({ length: 20 }, (_, i) => {
						const extensions = ["pdf", "docx", "xlsx", "pptx", "txt", "csv"];
						const statuses = ["FINISHED", "INDEXING", "FAILED", "CREATED"] as const;
						const extension = extensions[i % extensions.length];
						const status = statuses[i % statuses.length];

						return RagSourceFactory.build({
							filename: `very-long-document-name-for-testing-truncation-behavior-file-${i + 1}.${extension}`,
							sourceId: `file-${i + 1}`,
							status,
						});
					}),

					...Array.from({ length: 10 }, (_, i) => {
						return RagSourceFactory.build({
							sourceId: `url-${i + 1}`,
							status: "FINISHED",
							url: `https://www.very-long-domain-name-for-testing-url-truncation-behavior.example.com/extremely/long/path/that/should/trigger/text/truncation/in/the/ui/components/page-${i + 1}?query=very-long-query-parameter-that-continues-for-a-while`,
						});
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Testing Large Datasets with Long Names and Truncation Behavior",
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
	name: "Large Dataset - 20 Files + 10 URLs with Truncation",
};
