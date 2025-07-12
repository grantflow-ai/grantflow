import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { ApplicationDetailsStep } from "@/components/projects";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

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

export const OnlyDocuments: Story = {
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
	name: "Only Documents - Title and Documents",
};

export const OnlyUrls: Story = {
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
	name: "Only URLs - Title and URLs",
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

export const NoTitleWithDocuments: Story = {
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

export const LargeDatasetsWithTruncation: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					...Array.from({ length: 20 }, (_, i) => {
						const extensions = ["pdf", "docx", "xlsx", "pptx", "txt", "csv", "json", "xml"];
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
