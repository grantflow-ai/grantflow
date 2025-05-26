import { render, screen } from "@testing-library/react";
import WizardPage from "@/app/workspaces/wizard/page";

test("Step 1: Application Details", async () => {
	render(<WizardPage initialStep={0} />);

	expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
	expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
	expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
	expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();

	expect(screen.getByTestId("app-name")).toBeInTheDocument();
	expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
	expect(screen.getByTestId("save-exit-button")).toBeInTheDocument();
	expect(screen.getByTestId("step-indicators")).toBeInTheDocument();

	for (let i = 0; i < 6; i++) {
		expect(screen.getByTestId(`step-${i}`)).toBeInTheDocument();
		expect(screen.getByTestId(`step-title-${i}`)).toBeInTheDocument();
	}

	expect(screen.getByTestId("step-title-0")).toHaveTextContent("Application Details");
	expect(screen.getByTestId("step-title-0")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Next");
	expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
	expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
});

test("Step 2: Preview and Approve", async () => {
	render(<WizardPage initialStep={1} />);

	expect(screen.getByTestId("step-title-1")).toHaveTextContent("Preview and Approve");
	expect(screen.getByTestId("step-title-1")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();
	expect(screen.getByTestId("step-done")).toBeInTheDocument();

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Approve and Continue");
	expect(screen.getByTestId("back-button")).toBeInTheDocument();
	expect(screen.getByTestId("back-button")).toHaveTextContent("Back");

	const backButton = screen.getByTestId("back-button");
	expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
});

test("Step 3: Knowledge Base", async () => {
	render(<WizardPage initialStep={2} />);

	expect(screen.getByTestId("step-title-2")).toHaveTextContent("Knowledge Base");
	expect(screen.getByTestId("step-title-2")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();
	expect(screen.getAllByTestId("step-done").length).toBe(2);

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Next");
	expect(screen.getByTestId("back-button")).toBeInTheDocument();

	const backButton = screen.getByTestId("back-button");
	expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
	expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
});

test("Step 4: Research Plan", async () => {
	render(<WizardPage initialStep={3} />);

	expect(screen.getByTestId("step-title-3")).toHaveTextContent("Research Plan");
	expect(screen.getByTestId("step-title-3")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();
	expect(screen.getAllByTestId("step-done").length).toBe(3);

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Next");
	expect(screen.getByTestId("back-button")).toBeInTheDocument();

	const backButton = screen.getByTestId("back-button");
	expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
	expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
});

test("Step 5: Research Deep Dive", async () => {
	render(<WizardPage initialStep={4} />);

	expect(screen.getByTestId("step-title-4")).toHaveTextContent("Research Deep Dive");
	expect(screen.getByTestId("step-title-4")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();
	expect(screen.getAllByTestId("step-done").length).toBe(4);

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Next");
	expect(screen.getByTestId("back-button")).toBeInTheDocument();

	const backButton = screen.getByTestId("back-button");
	expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".mr-1")).not.toBeInTheDocument();
	expect(continueButton.querySelector(".ml-1")).toBeInTheDocument();
});

test("Step 6: Generate and Complete", async () => {
	render(<WizardPage initialStep={5} />);

	expect(screen.getByTestId("step-title-5")).toHaveTextContent("Generate and Complete");
	expect(screen.getByTestId("step-title-5")).toHaveClass("font-semibold");
	expect(screen.getByTestId("step-active")).toBeInTheDocument();
	expect(screen.getAllByTestId("step-done").length).toBe(5);

	expect(screen.getByTestId("continue-button")).toHaveTextContent("Generate");
	expect(screen.getByTestId("back-button")).toBeInTheDocument();

	const backButton = screen.getByTestId("back-button");
	expect(backButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(backButton.querySelector(".ml-1")).not.toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton.querySelector(".mr-1")).toBeInTheDocument();
	expect(continueButton.querySelector(".ml-1")).not.toBeInTheDocument();
});

test("Header Layout", async () => {
	render(<WizardPage initialStep={0} />);

	expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
	expect(screen.getByTestId("app-name")).toBeInTheDocument();
	expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
	expect(screen.getByTestId("save-exit-button")).toBeInTheDocument();
	expect(screen.getByTestId("step-indicators")).toBeInTheDocument();

	const stepIndicators = screen.getByTestId("step-indicators");
	expect(stepIndicators).toHaveClass("flex");

	for (let i = 0; i < 6; i++) {
		const step = screen.getByTestId(`step-${i}`);
		expect(step).toHaveClass("flex-1");
		expect(step).toHaveClass("flex");
		expect(step).toHaveClass("flex-col");
		expect(step).toHaveClass("items-center");
	}
});

test("Footer Layout", async () => {
	render(<WizardPage initialStep={2} />);

	expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
	expect(screen.getByTestId("continue-button")).toBeInTheDocument();
	expect(screen.getByTestId("back-button")).toBeInTheDocument();

	const continueButton = screen.getByTestId("continue-button");
	expect(continueButton).toHaveClass("btn-primary");
	expect(continueButton).toHaveClass("btn-lg");

	const backButton = screen.getByTestId("back-button");
	expect(backButton).toHaveClass("btn-secondary");
	expect(backButton).toHaveClass("btn-lg");
});
