import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { action } from "storybook/actions";
import { useApplicationStore } from "@/stores/application-store";
import { LinkPreviewItem } from "./link-preview-item";

const meta: Meta<typeof LinkPreviewItem> = {
	component: LinkPreviewItem,
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
	title: "Wizard/Components/LinkPreviewItem",
};

export default meta;
type Story = StoryObj<typeof LinkPreviewItem>;

export const Default: Story = {
	args: {
		parentId: "template-123",
		url: "https://example.com/funding-guidelines",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeUrl: (...args) => {
						action("remove-url")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const LongUrl: Story = {
	args: {
		parentId: "template-123",
		url: "https://grants.gov/web/grants/view-opportunity.html?oppId=332021&searchId=12345678901234567890",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeUrl: (...args) => {
						action("remove-url")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
};

export const Crawling: Story = {
	args: {
		parentId: "template-123",
		sourceStatus: "INDEXING",
		url: "https://grants.gov/funding-opportunity-details",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					removeUrl: (...args) => {
						action("remove-url")(...args);
						return Promise.resolve();
					},
				});
			}, []);
			return <Story />;
		},
	],
	name: "Being Crawled",
};

export const ApplicationStructureView: Story = {
	decorators: [
		() => {
			const links = [
				{
					description: "Completed processing",
					status: "FINISHED",
					url: "https://grants.gov/opportunity/funding-announcement-2024",
				},
				{
					description: "Currently indexing",
					status: "INDEXING",
					url: "https://nsf.gov/funding/pgm_summ.jsp?pims_id=5556",
				},
				{
					description: "Long URL example",
					status: "FINISHED",
					url: "https://grants.nih.gov/grants/guide/pa-files/PAR-24-123-very-long-funding-opportunity-announcement.html",
				},
				{
					description: "Ready to process",
					status: "CREATED",
					url: "https://example.org/grant-application-guidelines",
				},
			];

			return (
				<div className="space-y-2">
					<p className="text-sm text-gray-600 mb-4">
						Links as they appear in Step 2 (Application Structure) - deletion is disabled
					</p>
					{links.map((link, index) => (
						<LinkPreviewItem
							disableRemove={true}
							key={index}
							parentId="template-123"
							sourceStatus={link.status}
							url={link.url}
						/>
					))}
				</div>
			);
		},
	],
	name: "Application Structure View (No Delete)",
	parameters: {
		docs: {
			description: {
				story: "Shows how links appear in the Application Structure step where users cannot delete them. Demonstrates various link statuses (completed, indexing, created) all with remove functionality disabled.",
			},
		},
	},
};
