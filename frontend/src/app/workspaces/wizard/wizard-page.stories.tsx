import type { Meta, StoryObj } from "@storybook/react";
import WizardPage from "@/app/workspaces/wizard/page";

const WizardPageRenderer = ({
	initialStep = 0,
	showHeaderInfo = false,
}: {
	initialStep: number;
	showHeaderInfo?: boolean;
}) => {
	const props: Parameters<typeof WizardPage>[0] = {
		initialStep,
		showHeaderInfo,
	};
	return <WizardPage {...props} />;
};

const meta = {
	argTypes: {
		initialStep: {
			control: { max: 5, min: 0, step: 1, type: "range" },
			description: "Initial step of the wizard",
			table: { defaultValue: { summary: "0" } },
		},
		showHeaderInfo: {
			control: "boolean",
			description: "Toggle visibility of application name and deadline in header",
			table: { defaultValue: { summary: "false" } },
		},
	},
	component: WizardPageRenderer,
	parameters: {
		layout: "fullscreen",
		nextRouter: { path: "/workspaces/wizard", query: {} },
	},
	title: "Pages/Application Wizard",
} satisfies Meta<typeof WizardPageRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1_ApplicationDetails: Story = {
	args: { initialStep: 0, showHeaderInfo: false },
	name: "Step 1: Application Details",
	parameters: {
		docs: {
			description: {
				story: "First step: only the Next button is shown, Back is hidden.",
			},
		},
	},
};

export const Step2_PreviewAndApprove: Story = {
	args: { initialStep: 1, showHeaderInfo: true },
	name: "Step 2: Preview and Approve (with header info)",
	parameters: {
		docs: {
			description: {
				story: 'Second step: shows "Approve and Continue" with the approve icon.',
			},
		},
	},
};

export const Step3_KnowledgeBase: Story = {
	args: { initialStep: 2, showHeaderInfo: true },
	name: "Step 3: Knowledge Base",
};

export const Step4_ResearchPlan: Story = {
	args: { initialStep: 3, showHeaderInfo: true },
	name: "Step 4: Research Plan",
};

export const Step5_ResearchDeepDive: Story = {
	args: { initialStep: 4, showHeaderInfo: true },
	name: "Step 5: Research Deep Dive",
};

export const Step6_GenerateAndComplete: Story = {
	args: { initialStep: 5, showHeaderInfo: true },
	name: "Step 6: Generate and Complete",
	parameters: {
		docs: {
			description: {
				story: 'Final step: shows "Generate" button with your app logo icon.',
			},
		},
	},
};
