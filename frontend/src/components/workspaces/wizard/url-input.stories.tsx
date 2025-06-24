import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { action } from "storybook/actions";
import { useApplicationStore } from "@/stores/application-store";
import { UrlInput } from "./url-input";

const meta: Meta<typeof UrlInput> = {
	component: UrlInput,
	decorators: [
		(Story) => (
			<div className="max-w-md p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Components/Wizard/UrlInput",
};

export default meta;
type Story = StoryObj<typeof UrlInput>;

export const Default: Story = {
	args: {
		onUrlAdded: action("url-added"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const grantTemplate = GrantTemplateFactory.build({
					id: "template-123",
					rag_sources: [],
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					rag_sources: [],
				});
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithExistingUrls: Story = {
	args: {
		onUrlAdded: action("url-added"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://grants.gov/funding-opportunity",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://nsf.gov/application-guidelines",
					}),
				];
				const grantTemplate = GrantTemplateFactory.build({
					id: "template-123",
					rag_sources: ragSources,
				});
				const application = ApplicationWithTemplateFactory.build({
					grant_template: grantTemplate,
					rag_sources: [],
				});
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithoutParentId: Story = {
	args: {
		onUrlAdded: action("url-added"),
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [],
				});
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Without Parent ID (Error State)",
};

export const WithoutApplication: Story = {
	args: {
		onUrlAdded: action("url-added"),
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application: null,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithApplicationRagSources: Story = {
	args: {
		onUrlAdded: action("url-added"),
		parentId: "different-parent",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://example.com/research-data",
					}),
				];
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: ragSources,
				});
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "With Application RAG Sources",
};

export const WithoutCallback: Story = {
	args: {
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const application = ApplicationWithTemplateFactory.build({
					rag_sources: [],
				});
				useApplicationStore.setState({
					addUrl: (...args) => {
						action("add-url")(...args);
						return Promise.resolve();
					},
					application,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Without URL Added Callback",
};