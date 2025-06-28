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
	title: "Components/Wizard/LinkPreviewItem",
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

export const SecureUrl: Story = {
	args: {
		parentId: "template-123",
		url: "https://secure.university.edu/research/proposals/climate-change-initiative",
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

export const GovernmentUrl: Story = {
	args: {
		parentId: "template-123",
		url: "https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=503214",
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

export const WithoutParentId: Story = {
	args: {
		url: "https://example.com/no-parent-id",
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
	name: "Without Parent ID",
};

export const MultipleLinks: Story = {
	decorators: [
		() => {
			useEffect(() => {
				useApplicationStore.setState({
					removeUrl: (...args) => {
						action("remove-url")(...args);
						return Promise.resolve();
					},
				});
			}, []);

			const urls = [
				"https://grants.gov/web/grants/view-opportunity.html?oppId=332021",
				"https://www.nsf.gov/funding/pgm_summ.jsp?pims_id=503214",
				"https://university.edu/research/climate-change-guidelines",
				"https://example.com/application-requirements",
				"https://secure.funding-agency.gov/submission-portal",
			];

			return (
				<div className="max-w-lg space-y-4 p-8">
					{urls.map((url) => (
						<LinkPreviewItem key={url} parentId="template-123" url={url} />
					))}
				</div>
			);
		},
	],
	parameters: {
		layout: "centered",
	},
};
