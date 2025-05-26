import type { Meta, StoryObj } from "@storybook/react";
import WizardPage from "./page";

const meta = {
	component: WizardPage,
	parameters: {
		layout: "fullscreen",
		nextRouter: {
			path: "/workspaces/wizard",
			query: {},
		},
	},
	title: "Pages/WorkspaceWizard",
} satisfies Meta<typeof WizardPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1_ApplicationDetails: Story = {
	args: {
		initialStep: 0,
	},
	name: "Step 1: Application Details",
};

export const Step2_PreviewAndApprove: Story = {
	args: {
		initialStep: 1,
	},
	name: "Step 2: Preview and Approve",
};

export const Step3_KnowledgeBase: Story = {
	args: {
		initialStep: 2,
	},
	name: "Step 3: Knowledge Base",
};

export const Step4_ResearchPlan: Story = {
	args: {
		initialStep: 3,
	},
	name: "Step 4: Research Plan",
};

export const Step5_ResearchDeepDive: Story = {
	args: {
		initialStep: 4,
	},
	name: "Step 5: Research Deep Dive",
};

export const Step6_GenerateAndComplete: Story = {
	args: {
		initialStep: 5,
	},
	name: "Step 6: Generate and Complete",
};

export const HeaderLayout: Story = {
	args: {
		initialStep: 0,
	},
};

export const FooterLayout: Story = {
	args: {
		initialStep: 2,
	},
};
