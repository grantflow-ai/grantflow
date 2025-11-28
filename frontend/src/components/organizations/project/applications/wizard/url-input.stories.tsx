import { ApplicationWithTemplateFactory, GrantTemplateFactory, RagSourceFactory } from "::testing/factories";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { action } from "storybook/actions";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";
import { UrlInput } from "./url-input";

const buildApplication = (overrides?: Partial<API.CreateApplication.Http201.ResponseBody>) =>
	ApplicationWithTemplateFactory.build(overrides);
const buildGrantTemplate = (
	overrides?: Partial<NonNullable<API.CreateApplication.Http201.ResponseBody["grant_template"]>>,
) => GrantTemplateFactory.build(overrides);

const meta: Meta<typeof UrlInput> = {
	argTypes: {
		parentId: {
			control: "text",
			description: "ID of the parent template or application",
		},
	},
	component: UrlInput,
	decorators: [
		(Story) => (
			<div className="w-full min-w-[600px] max-w-4xl p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg">
				<Story />
			</div>
		),
	],
	parameters: {
		actions: {
			disable: true,
		},
		controls: {
			include: ["parentId"],
		},
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
				const grantTemplate = buildGrantTemplate({
					id: "template-123",
					rag_sources: [],
				});
				const application = buildApplication({
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
				const grantTemplate = buildGrantTemplate({
					id: "template-123",
					rag_sources: ragSources,
				});
				const application = buildApplication({
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
				const application = buildApplication({
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
				const grantTemplate = buildGrantTemplate({
					id: "template-123",
					rag_sources: ragSources,
				});
				const application = buildApplication({
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
				const grantTemplate = buildGrantTemplate({
					id: "template-123",
					rag_sources: ragSources,
				});
				const application = buildApplication({
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
		const grantTemplate = buildGrantTemplate({
			id: "template-123",
			rag_sources: [
				RagSourceFactory.build({
					sourceId: "1",
					status: "FINISHED",
					url: "https://grants.gov/funding-opportunity",
				}),
			],
		});
		const application = buildApplication({
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
		<div className="space-y-8 p-8 max-w-6xl mx-auto">
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Empty State</h3>
				<p className="text-sm text-gray-600 mb-4">Clean input ready for URL entry</p>
				<div className="w-full p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
					<UrlInput parentId="empty-template" />
				</div>
			</div>
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Filled State</h3>
				<p className="text-sm text-gray-600 mb-4">Shows existing URLs from the template</p>
				<div className="w-full p-6 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg">
					<UrlInput parentId="template-123" />
				</div>
			</div>
			<div className="space-y-2">
				<h3 className="text-lg font-semibold">Error State</h3>
				<p className="text-sm text-gray-600 mb-4">Missing parent ID triggers error</p>
				<div className="w-full p-6 bg-gradient-to-br from-red-50 to-pink-100 rounded-lg">
					<UrlInput />
				</div>
			</div>
		</div>
	);
};

export const AllStates: Story = {
	name: "All States Overview",
	parameters: {
		layout: "fullscreen",
	},
	render: () => <AllStatesComponent />,
};
