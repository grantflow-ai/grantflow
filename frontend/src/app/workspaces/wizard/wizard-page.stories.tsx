import type { Meta, StoryObj } from "@storybook/react";
import WizardPage from "./page";
import { expect, within } from "@storybook/test";

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
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("wizard-page")).toBeInTheDocument();
		await expect(canvas.getByTestId("wizard-header")).toBeInTheDocument();
		await expect(canvas.getByTestId("step-content-container")).toBeInTheDocument();
		await expect(canvas.getByTestId("wizard-footer")).toBeInTheDocument();

		await expect(canvas.getByTestId("app-name")).toBeInTheDocument();
		await expect(canvas.getByTestId("deadline-component")).toBeInTheDocument();
		await expect(canvas.getByTestId("save-exit-button")).toBeInTheDocument();
		await expect(canvas.getByTestId("step-indicators")).toBeInTheDocument();

		for (let i = 0; i < 6; i++) {
			await expect(canvas.getByTestId(`step-${i}`)).toBeInTheDocument();
			await expect(canvas.getByTestId(`step-title-${i}`)).toBeInTheDocument();
		}

		await expect(canvas.getByTestId("step-title-0")).toHaveTextContent("Application Details");
		await expect(canvas.getByTestId("step-title-0")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Next");
		await expect(canvas.queryByTestId("back-button")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
		await expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
	},
};

export const Step2_PreviewAndApprove: Story = {
	args: {
		initialStep: 1,
	},
	name: "Step 2: Preview and Approve",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("step-title-1")).toHaveTextContent("Preview and Approve");
		await expect(canvas.getByTestId("step-title-1")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();
		await expect(canvas.getByTestId("step-done")).toBeInTheDocument();

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Approve and Continue");
		await expect(canvas.getByTestId("back-button")).toBeInTheDocument();
		await expect(canvas.getByTestId("back-button")).toHaveTextContent("Back");

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	},
};

export const Step3_KnowledgeBase: Story = {
	args: {
		initialStep: 2,
	},
	name: "Step 3: Knowledge Base",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("step-title-2")).toHaveTextContent("Knowledge Base");
		await expect(canvas.getByTestId("step-title-2")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();
		await expect(canvas.getAllByTestId("step-done").length).toBe(2);

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Next");
		await expect(canvas.getByTestId("back-button")).toBeInTheDocument();

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	},
};

export const Step4_ResearchPlan: Story = {
	args: {
		initialStep: 3,
	},
	name: "Step 4: Research Plan",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("step-title-3")).toHaveTextContent("Research Plan");
		await expect(canvas.getByTestId("step-title-3")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();
		await expect(canvas.getAllByTestId("step-done").length).toBe(3);

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Next");
		await expect(canvas.getByTestId("back-button")).toBeInTheDocument();

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	},
};

export const Step5_ResearchDeepDive: Story = {
	args: {
		initialStep: 4,
	},
	name: "Step 5: Research Deep Dive",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("step-title-4")).toHaveTextContent("Research Deep Dive");
		await expect(canvas.getByTestId("step-title-4")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();
		await expect(canvas.getAllByTestId("step-done").length).toBe(4);

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Next");
		await expect(canvas.getByTestId("back-button")).toBeInTheDocument();

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	},
};

export const Step6_GenerateAndComplete: Story = {
	args: {
		initialStep: 5,
	},
	name: "Step 6: Generate and Complete",
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("step-title-5")).toHaveTextContent("Generate and Complete");
		await expect(canvas.getByTestId("step-title-5")).toHaveClass("font-semibold");
		await expect(canvas.getByTestId("step-active")).toBeInTheDocument();
		await expect(canvas.getAllByTestId("step-done").length).toBe(5);

		await expect(canvas.getByTestId("continue-button")).toHaveTextContent("Generate");
		await expect(canvas.getByTestId("back-button")).toBeInTheDocument();

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton.querySelector(".mr-1")).toBeInTheDocument();
		await expect(continueButton.querySelector(".ml-1")).not.toBeInTheDocument();
	},
};

export const HeaderLayout: Story = {
	args: {
		initialStep: 0,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		await expect(canvas.getByTestId("wizard-header")).toBeInTheDocument();
		await expect(canvas.getByTestId("app-name")).toBeInTheDocument();
		await expect(canvas.getByTestId("deadline-component")).toBeInTheDocument();
		await expect(canvas.getByTestId("save-exit-button")).toBeInTheDocument();
		await expect(canvas.getByTestId("step-indicators")).toBeInTheDocument();

		const stepIndicators = canvas.getByTestId("step-indicators");
		await expect(stepIndicators).toHaveClass("flex");

		for (let i = 0; i < 6; i++) {
			const step = canvas.getByTestId(`step-${i}`);
			await expect(step).toHaveClass("flex-1");
			await expect(step).toHaveClass("flex");
			await expect(step).toHaveClass("flex-col");
			await expect(step).toHaveClass("items-center");

			const stepTitle = canvas.getByTestId(`step-title-${i}`);
			const titleContainer = stepTitle.parentElement;
			await expect(titleContainer).toHaveClass("mt-2");
		}
	},
};

export const FooterLayout: Story = {
	args: {
		initialStep: 2,
	},
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const footer = canvas.getByTestId("wizard-footer");
		await expect(footer).toHaveClass("w-full");
		await expect(footer).toHaveClass("h-auto");
		await expect(footer).toHaveClass("flex");
		await expect(footer).toHaveClass("justify-between");

		const backButton = canvas.getByTestId("back-button");
		await expect(backButton).toHaveTextContent("Back");
		await expect(backButton).toHaveClass("border");
		await expect(backButton).toHaveClass("bg-transparent");
		await expect(backButton.querySelector(".mr-1")).toBeInTheDocument();

		const continueButton = canvas.getByTestId("continue-button");
		await expect(continueButton).toHaveTextContent("Next");
		await expect(continueButton).toHaveClass("hover:bg-accent");
		await expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	},
};
