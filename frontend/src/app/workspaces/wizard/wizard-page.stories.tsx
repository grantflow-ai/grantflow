import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "@storybook/test";
import WizardPage from "@/app/workspaces/wizard/page";

const meta = {
	component: WizardPage,
	parameters: {
		layout: "fullscreen",
		nextRouter: {
			path: "/workspaces/wizard",
			query: {},
		},
	},
	title: "Pages/Application Workspace Wrapper",
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

export const UserInteraction: Story = {
	args: {
		initialStep: 0,
	},
	play: async ({ canvasElement, step }) => {
		const canvas = within(canvasElement);

		await step("Wait for component to render", () => {
			void expect(canvas.getByTestId("wizard-header")).toBeInTheDocument();
		});

		await step("Click the continue button", async () => {
			const continueButton = canvas.getByTestId("continue-button");
			await userEvent.click(continueButton);
		});

		await step("Verify we moved to the next step", () => {
			void expect(canvas.getByText("Preview and Approve")).toBeInTheDocument();
		});
	},
};

export const WithCustomParameters: Story = {
	args: {
		initialStep: 4,
	},
	parameters: {
		layout: "centered",
		viewport: {
			defaultViewport: "mobile",
		},
	},
};

export const NoControls: Story = {
	args: {
		initialStep: 5,
	},
	parameters: {
		controls: { disable: true },
	},
};
