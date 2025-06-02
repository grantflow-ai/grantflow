import { FileContainer } from "./file-container";

// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof FileContainer> = {
	component: FileContainer,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	title: "Components/FileContainer",
};

export default meta;
type Story = StoryObj<typeof FileContainer>;

// ==============================
// UI TESTING STORIES (WITH MOCKS)
// ==============================

/**
 * UI testing stories with mocked API calls
 * These stories are for quick UI checks without real API calls
 */
export const MockedDefault: Story = {
	args: {
		applicationId: "application-456",
		maxFileCount: 5,
		workspaceId: "workspace-123",
	},
	name: "UI: Default",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { url: "https://example.com/upload" },
				status: 201,
				url: "/api/workspaces/*/applications/*/files/upload-url*",
			},
		],
	},
};

export const MockedWithInitialFiles: Story = {
	args: {
		applicationId: "application-456",
		initialFiles: [
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "document1.pdf",
				id: "file-1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1024 * 50,
			},
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "document2.docx",
				id: "file-2",
				indexing_status: "FINISHED" as const,
				mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				size: 1024 * 100,
			},
		],
		maxFileCount: 5,
		workspaceId: "workspace-123",
	},
	name: "UI: With Initial Files",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { url: "https://example.com/upload" },
				status: 201,
				url: "/api/workspaces/*/applications/*/files/upload-url*",
			},
			{
				method: "DELETE",
				response: undefined,
				status: 204,
				url: "/api/workspaces/*/applications/*/files/*",
			},
		],
	},
};

export const MockedWithLimitReached: Story = {
	args: {
		applicationId: "application-456",
		initialFiles: Array.from({ length: 5 })
			.fill(null)
			.map((_, i) => ({
				created_at: "2023-01-01T00:00:00Z",
				filename: `document${i}.pdf`,
				id: `file-${i}`,
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1024 * 50,
			})),
		maxFileCount: 5,
		workspaceId: "workspace-123",
	},
	name: "UI: With Limit Reached",
	parameters: {
		mockData: [
			{
				method: "DELETE",
				response: undefined,
				status: 204,
				url: "/api/workspaces/*/applications/*/files/*",
			},
		],
	},
};

export const MockedErrorState: Story = {
	args: {
		applicationId: "application-456",
		workspaceId: "workspace-123",
	},
	name: "UI: Error State",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { detail: "Error creating upload URL" },
				status: 400,
				url: "/api/workspaces/*/applications/*/files/upload-url*",
			},
		],
	},
};

// ==============================
// INTEGRATION TESTING STORIES
// ==============================

/**
 * Integration testing stories with real API calls
 * These stories will make actual API calls to the backend
 */
export const IntegrationDefault: Story = {
	args: {
		applicationId: "application-456",
		maxFileCount: 5,
		workspaceId: "workspace-123",
	},
	name: "Integration: Default",
};

export const IntegrationWithInitialFiles: Story = {
	args: {
		applicationId: "application-456",
		initialFiles: [
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "document1.pdf",
				id: "file-1",
				indexing_status: "FINISHED" as const,
				mime_type: "application/pdf",
				size: 1024 * 50,
			},
			{
				created_at: "2023-01-01T00:00:00Z",
				filename: "document2.docx",
				id: "file-2",
				indexing_status: "FINISHED" as const,
				mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
				size: 1024 * 100,
			},
		],
		maxFileCount: 5,
		workspaceId: "workspace-123",
	},
	name: "Integration: With Initial Files",
};
