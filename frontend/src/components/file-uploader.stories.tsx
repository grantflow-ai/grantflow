import { FileUploader } from "./file-uploader";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof FileUploader> = {
	argTypes: {
		onFilesAdded: { action: "onFilesAdded" },
	},
	component: FileUploader,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "Components/FileUploader",
};

export default meta;
type Story = StoryObj<typeof FileUploader>;

export const Default: Story = {
	args: {
		fieldName: "documents",
	},
};

export const WithFiles: Story = {
	args: {
		fieldName: "documents",
	},
};

export const AsDropZone: Story = {
	args: {
		fieldName: "documents",
		isDropZone: true,
	},
};

export const DropZoneWithFiles: Story = {
	args: {
		fieldName: "documents",
		isDropZone: true,
	},
};
