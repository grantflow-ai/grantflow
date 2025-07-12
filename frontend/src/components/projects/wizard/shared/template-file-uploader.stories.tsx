import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { TemplateFileUploader } from "@/components/projects";
import { useApplicationStore } from "@/stores/application-store";

const meta: Meta<typeof TemplateFileUploader> = {
	component: TemplateFileUploader,
	decorators: [
		(Story) => (
			<div className="p-8">
				<Story />
			</div>
		),
	],
	parameters: {
		layout: "centered",
	},
	title: "Components/Wizard/TemplateFileUploader",
};

export default meta;
type Story = StoryObj<typeof TemplateFileUploader>;

export const Default: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
};

export const WithParentId: Story = {
	args: {
		parentId: "template-123",
	},
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "With Parent ID",
};

export const WithUploadInProgress: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: true,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Upload in Progress",
};

export const WithoutCallback: Story = {
	decorators: [
		(Story) => {
			useEffect(() => {
				useApplicationStore.setState({
					application: null,
					areAppOperationsInProgress: false,
				});
			}, []);
			return <Story />;
		},
	],
	name: "Without Upload Callback",
};
