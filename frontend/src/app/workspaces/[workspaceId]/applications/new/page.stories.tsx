import CreateGrantApplicationWizardPage from "./page";

import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof CreateGrantApplicationWizardPage> = {
	component: CreateGrantApplicationWizardPage,
	parameters: {
		layout: "fullscreen",
		nextjs: {
			navigation: {
				params: {
					workspaceId: "workspace-123",
				},
			},
		},
	},
	tags: ["autodocs"],
	title: "Pages/CreateGrantApplicationWizard",
};

export default meta;
type Story = StoryObj<typeof CreateGrantApplicationWizardPage>;

export const Default: Story = {
	name: "Default View",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { id: "app-123", template_id: "template-456" },
				status: 201,
				url: "/api/workspaces/*/applications",
			},
			{
				method: "PATCH",
				response: {},
				status: 200,
				url: "/api/workspaces/*/applications/*",
			},
		],
	},
};

export const WithCompletedFirstStep: Story = {
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { id: "app-123", template_id: "template-456" },
				status: 201,
				url: "/api/workspaces/*/applications",
			},
			{
				method: "PATCH",
				response: {},
				status: 200,
				url: "/api/workspaces/*/applications/*",
			},
			{
				method: "POST",
				response: { url: "https://example.com/upload" },
				status: 201,
				url: "/api/workspaces/*/applications/*/files/upload-url*",
			},
		],
	},
};

export const WithNotifications: Story = {
	name: "With Processing Notifications",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { id: "app-123", template_id: "template-456" },
				status: 201,
				url: "/api/workspaces/*/applications",
			},
			{
				method: "PATCH",
				response: {},
				status: 200,
				url: "/api/workspaces/*/applications/*",
			},
		],
	},
};

export const ErrorState: Story = {
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { detail: "Failed to create application" },
				status: 400,
				url: "/api/workspaces/*/applications",
			},
		],
	},
};

export const ConnectionError: Story = {
	name: "WebSocket Connection Error",
	parameters: {
		mockData: [
			{
				method: "POST",
				response: { id: "app-123", template_id: "template-456" },
				status: 201,
				url: "/api/workspaces/*/applications",
			},
			{
				method: "PATCH",
				response: {},
				status: 200,
				url: "/api/workspaces/*/applications/*",
			},
		],
		mswParameters: {
			websocketStatus: "error",
		},
	},
};
