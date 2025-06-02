import { FileUploader } from "./file-uploader";

// eslint-disable-next-line storybook/no-renderer-packages
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
		currentFileCount: 0,
		fieldName: "documents",
		maxFileCount: 5,
	},
};

export const WithLimitReached: Story = {
	args: {
		currentFileCount: 5,
		fieldName: "documents",
		maxFileCount: 5,
	},
};

export const AsDropZone: Story = {
	args: {
		currentFileCount: 0,
		fieldName: "documents",
		isDropZone: true,
		maxFileCount: 10,
	},
};

export const DropZoneWithLimitReached: Story = {
	args: {
		currentFileCount: 10,
		fieldName: "documents",
		isDropZone: true,
		maxFileCount: 10,
	},
};

export const WithUnlimitedFiles: Story = {
	args: {
		currentFileCount: 3,
		fieldName: "documents",
		maxFileCount: Infinity,
	},
};
