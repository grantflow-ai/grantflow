import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useApplicationStore } from "@/stores/application-store";
import { ApplicationPreview } from "./application-preview";

const meta: Meta<typeof ApplicationPreview> = {
	component: ApplicationPreview,
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
	title: "Components/Wizard/ApplicationPreview",
};

export default meta;
type Story = StoryObj<typeof ApplicationPreview>;

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
			}, []);
			return <Story />;
		},
	],
};

export const WithTitleOnly: Story = {
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
						filename: "budget-template.xlsx",
						sourceId: "3",
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
			}, []);
			return <Story />;
		},
	],
	name: "With URLs",
};

export const WithDocumentsAndUrls: Story = {
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
			}, []);
			return <Story />;
		},
	],
	name: "With Documents and URLs",
};

export const WithConnectionStatus: Story = {
	args: {
		connectionStatus: "Connected",
		connectionStatusColor: "bg-green-500",
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
			}, []);
			return <Story />;
		},
	],
};

export const LongTitle: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						filename: "comprehensive-research-proposal.pdf",
						sourceId: "1",
						status: "FINISHED",
					}),
				];

				const grantTemplate = GrantTemplateFactory.build({
					rag_sources: ragSources,
				});

				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					title: "Comprehensive Climate Change Impact Assessment and Mitigation Strategies for Coastal Marine Ecosystems: A Multi-Disciplinary Research Initiative",
				});

				useApplicationStore.setState({
					application,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "With Long Title",
};

export const ManyDocuments: Story = {
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
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "budget-template.xlsx",
						sourceId: "3",
						status: "INDEXING",
					}),
					RagSourceFactory.build({
						filename: "evaluation-criteria.pdf",
						sourceId: "4",
						status: "FINISHED",
					}),
					RagSourceFactory.build({
						filename: "submission-requirements.docx",
						sourceId: "5",
						status: "FAILED",
					}),
					RagSourceFactory.build({
						filename: "reviewer-guidelines.pdf",
						sourceId: "6",
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
			}, []);
			return <Story />;
		},
	],
	name: "With Many Documents",
};
