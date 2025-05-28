import { act, fireEvent, render, screen } from "@testing-library/react";
import WizardPage from "@/app/workspaces/wizard/page";

const advanceToStep = async (step: number) => {
	const result = render(<WizardPage />);

	if (step === 0) {
		return result;
	}

	for (let i = 0; i < step; i++) {
		await act(async () => {
			const continueButton = screen.getByTestId("continue-button");
			fireEvent.click(continueButton);
			await new Promise((resolve) => setTimeout(resolve, 10));
		});
	}

	return result;
};

describe("Grant Application Wizard - Step Rendering and Layout", () => {
	it("displays the Application Details step (Step 1) with proper layout components and navigation state", async () => {
		render(<WizardPage />);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();

		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
	});

	it("displays the Application Structure step (Step 2) with both back and continue navigation options", async () => {
		await advanceToStep(1);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});

	it("displays the Knowledge Base setup step (Step 3) with full navigation controls", async () => {
		await advanceToStep(2);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();

		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});

	it("displays the Research Plan definition step (Step 4) with bidirectional navigation", async () => {
		await advanceToStep(3);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();

		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});

	it("displays the Research Deep Dive step (Step 5) for in-depth research configuration", async () => {
		await advanceToStep(4);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});

	it("displays the final Generate and Complete step (Step 6) for application finalization", async () => {
		await advanceToStep(5);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

		expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});
});

describe("Grant Application Wizard - Navigation Logic and User Flow", () => {
	it("prevents backward navigation on the first step to enforce linear progression through application details", async () => {
		await advanceToStep(0);

		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
	});

	it("enables full bidirectional navigation on intermediate steps for flexible workflow editing", async () => {
		await advanceToStep(2);

		expect(screen.getByTestId("continue-button")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();
	});

	it("allows users to navigate backwards through completed steps to review and modify previous inputs", async () => {
		await advanceToStep(2);

		expect(screen.getByTestId("container-for-step-3")).toBeInTheDocument();

		const backButton = screen.getByTestId("back-button");
		fireEvent.click(backButton);

		expect(screen.getByTestId("container-for-step-2")).toBeInTheDocument();
	});

	it("advances users through the grant application workflow step-by-step when continuing", async () => {
		await advanceToStep(1);

		expect(screen.getByTestId("container-for-step-2")).toBeInTheDocument();

		const continueButton = screen.getByTestId("continue-button");
		fireEvent.click(continueButton);

		expect(screen.getByTestId("container-for-step-3")).toBeInTheDocument();
	});

	it("enforces wizard boundaries by preventing navigation below the initial application details step", async () => {
		await advanceToStep(0);

		expect(screen.getByTestId("container-for-step-1")).toBeInTheDocument();
		expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();

		const continueButton = screen.getByTestId("continue-button");
		fireEvent.click(continueButton);

		expect(screen.getByTestId("container-for-step-2")).toBeInTheDocument();
		expect(screen.getByTestId("back-button")).toBeInTheDocument();

		const backButton = screen.getByTestId("back-button");
		fireEvent.click(backButton);

		expect(screen.getByTestId("container-for-step-1")).toBeInTheDocument();
		expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
	});
});
