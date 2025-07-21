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
