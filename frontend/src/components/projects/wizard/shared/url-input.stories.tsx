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
	title: "Wizard/Components/UrlInput",
};

export default meta;
type Story = StoryObj<typeof UrlInput>;

export const Empty: Story = {
	args: {
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
	name: "Empty State",
};

export const Filled: Story = {
	args: {
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
	name: "Filled State (With Existing URLs)",
};

export const ErrorState: Story = {
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
	name: "Error State (Missing Parent ID)",
};

export const Crawling: Story = {
	args: {
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "INDEXING",
						url: "https://grants.gov/funding-opportunity",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://nsf.gov/application-guidelines",
					}),
					RagSourceFactory.build({
						sourceId: "3",
						status: "INDEXING",
						url: "https://nih.gov/research-funding/opportunities",
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
	name: "URLs Being Crawled",
};

export const LongUrl: Story = {
	args: {
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				const ragSources = [
					RagSourceFactory.build({
						sourceId: "1",
						status: "FINISHED",
						url: "https://www.example-very-long-domain-name.com/research/funding-opportunities/detailed-application-guidelines/section-1/subsection-a/requirements-and-specifications?category=environmental&type=research&year=2024&status=active",
					}),
					RagSourceFactory.build({
						sourceId: "2",
						status: "FINISHED",
						url: "https://national-science-foundation.gov/funding/programs/biological-sciences/molecular-cellular-biosciences/protein-dynamics-and-interactions/application-procedures/detailed-instructions",
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
	name: "Long URL Handling",
};

const AllStatesComponent = () => {
	useEffect(() => {
		const grantTemplate = GrantTemplateFactory.build({
			id: "template-123",
			rag_sources: [
				RagSourceFactory.build({
					sourceId: "1",
					status: "FINISHED",
					url: "https://grants.gov/funding-opportunity",
				}),
			],
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

	return (
		<div className="space-y-8">
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Empty State</h3>
				<p className="text-sm text-gray-600 mb-4">Clean input ready for URL entry</p>
				<div className="max-w-md">
					<UrlInput parentId="empty-template" />
				</div>
			</div>
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Filled State</h3>
				<p className="text-sm text-gray-600 mb-4">Shows existing URLs from the template</p>
				<div className="max-w-md">
					<UrlInput parentId="template-123" />
				</div>
			</div>
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Error State</h3>
				<p className="text-sm text-gray-600 mb-4">Missing parent ID triggers error</p>
				<div className="max-w-md">
					<UrlInput />
				</div>
			</div>
		</div>
	);
};

export const AllStates: Story = {
	name: "All States Overview",
	parameters: {
		layout: "padded",
	},
	render: () => <AllStatesComponent />,
};
