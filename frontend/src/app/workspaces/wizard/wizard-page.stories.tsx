import { useEffect } from "react";

import WizardPage from "@/app/workspaces/wizard/page";

// eslint-disable-next-line storybook/no-renderer-packages
import type { Meta, StoryObj } from "@storybook/react";

const Step1 = () => {
	return <WizardPage />;
};

const Step2 = () => {
	useEffect(() => {
		const nextButton = document.querySelector('[data-testid="continue-button"]');
		if (nextButton) {
			nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
		}
	}, []);
	return <WizardPage />;
};

const Step3 = () => {
	useEffect(() => {
		const nextButton = document.querySelector('[data-testid="continue-button"]');
		if (nextButton) {
			nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			setTimeout(() => {
				nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			}, 50);
		}
	}, []);
	return <WizardPage />;
};

const Step4 = () => {
	useEffect(() => {
		const nextButton = document.querySelector('[data-testid="continue-button"]');
		if (nextButton) {
			nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			setTimeout(() => {
				nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				setTimeout(() => {
					nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				}, 50);
			}, 50);
		}
	}, []);
	return <WizardPage />;
};

const Step5 = () => {
	useEffect(() => {
		const nextButton = document.querySelector('[data-testid="continue-button"]');
		if (nextButton) {
			nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			setTimeout(() => {
				nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				setTimeout(() => {
					nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
					setTimeout(() => {
						nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
					}, 50);
				}, 50);
			}, 50);
		}
	}, []);
	return <WizardPage />;
};

const Step6 = () => {
	useEffect(() => {
		const nextButton = document.querySelector('[data-testid="continue-button"]');
		if (nextButton) {
			nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
			setTimeout(() => {
				nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
				setTimeout(() => {
					nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
					setTimeout(() => {
						nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
						setTimeout(() => {
							nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
						}, 50);
					}, 50);
				}, 50);
			}, 50);
		}
	}, []);
	return <WizardPage />;
};

type WizardStoryComponent = typeof Step1 | typeof Step2 | typeof Step3 | typeof Step4 | typeof Step5 | typeof Step6;

const meta = {
	parameters: {
		layout: "fullscreen",
		nextRouter: { path: "/workspaces/wizard", query: {} },
	},
	title: "Pages/Application Wizard",
} satisfies Meta<WizardStoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Step1_ApplicationDetails: Story = {
	name: "Step 1: Application Details",
	parameters: {
		docs: {
			description: {
				story: "First step: only the Next button is shown, Back is hidden.",
			},
		},
	},
	render: () => <Step1 />,
};

export const Step2_PreviewAndApprove: Story = {
	name: "Step 2: Preview and Approve (with header info)",
	parameters: {
		docs: {
			description: {
				story: 'Second step: shows "Approve and Continue" with the approve icon.',
			},
		},
	},
	render: () => <Step2 />,
};

export const Step3_KnowledgeBase: Story = {
	name: "Step 3: Knowledge Base",
	render: () => <Step3 />,
};

export const Step4_ResearchPlan: Story = {
	name: "Step 4: Research Plan",
	render: () => <Step4 />,
};

export const Step5_ResearchDeepDive: Story = {
	name: "Step 5: Research Deep Dive",
	render: () => <Step5 />,
};

export const Step6_GenerateAndComplete: Story = {
	name: "Step 6: Generate and Complete",
	parameters: {
		docs: {
			description: {
				story: 'Final step: shows "Generate" button with your app logo icon.',
			},
		},
	},
	render: () => <Step6 />,
};
