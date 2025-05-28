import { render, screen } from "@testing-library/react";

import { StepIndicator, WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	describe("Navigation Button Visibility - Conditional Back Button Display", () => {
		it("displays back button for steps after the first to enable backward navigation", () => {
			render(<WizardFooter currentStep={1} onBack={() => {}} onContinue={() => {}} showBack={true} />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("hides back button on the first step to enforce linear progression through the wizard", () => {
			render(<WizardFooter currentStep={0} onBack={() => {}} onContinue={() => {}} showBack={false} />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Action Button Configuration - Context-Aware Button Text and Icons", () => {
		it("displays approval action on step 2 with 'Approve and Continue' text and approval/forward icons", () => {
			const { container } = render(
				<WizardFooter currentStep={1} onBack={() => {}} onContinue={() => {}} showBack={true} />,
			);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Approve and Continue");

			const approveIcon = container.querySelector('[data-testid="icon-approve"]');
			expect(approveIcon).toBeInTheDocument();

			const goAheadIcon = container.querySelector('[data-testid="icon-go-ahead"]');
			expect(goAheadIcon).toBeInTheDocument();

			const buttonLogoIcon = container.querySelector('[data-testid="icon-button-logo"]');
			expect(buttonLogoIcon).not.toBeInTheDocument();
		});

		it("displays generation action on final step (step 6) with 'Generate' text and company logo icon", () => {
			const { container } = render(
				<WizardFooter currentStep={5} onBack={() => {}} onContinue={() => {}} showBack={true} />,
			);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Generate");

			const buttonLogoIcon = container.querySelector('[data-testid="icon-button-logo"]');
			expect(buttonLogoIcon).toBeInTheDocument();

			const goAheadIcon = container.querySelector('[data-testid="icon-go-ahead"]');
			expect(goAheadIcon).not.toBeInTheDocument();

			const approveIcon = container.querySelector('[data-testid="icon-approve"]');
			expect(approveIcon).not.toBeInTheDocument();
		});

		it("displays standard navigation on intermediate steps (3-5) with 'Next' text and forward arrow", () => {
			const { container } = render(
				<WizardFooter currentStep={2} onBack={() => {}} onContinue={() => {}} showBack={true} />,
			);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Next");

			const goAheadIcon = container.querySelector('[data-testid="icon-go-ahead"]');
			expect(goAheadIcon).toBeInTheDocument();

			const approveIcon = container.querySelector('[data-testid="icon-approve"]');
			expect(approveIcon).not.toBeInTheDocument();

			const buttonLogoIcon = container.querySelector('[data-testid="icon-button-logo"]');
			expect(buttonLogoIcon).not.toBeInTheDocument();
		});
	});
});

describe("WizardHeader - Application Progress and Information Display", () => {
	const mockStepTitles = [
		"Application Details",
		"Preview and Approve",
		"Knowledge Base",
		"Research Plan",
		"Research Deep Dive",
		"Generate and Complete",
	];

	describe("Header Info Visibility", () => {
		it("shows application name and deadline when header info is visible", () => {
			render(
				<WizardHeader
					applicationName="Test Grant Application"
					currentStep={0}
					showHeaderInfo={true}
					stepTitles={mockStepTitles}
				/>,
			);

			expect(screen.getByTestId("app-name")).toBeInTheDocument();
			expect(screen.getByTestId("app-name")).toHaveTextContent("Test Grant Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("hides application name and deadline when header info is not visible", () => {
			render(
				<WizardHeader
					applicationName="Test Grant Application"
					currentStep={0}
					showHeaderInfo={false}
					stepTitles={mockStepTitles}
				/>,
			);

			expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();
			expect(screen.queryByTestId("deadline-component")).not.toBeInTheDocument();
		});
	});

	describe("Step Indicators in Progress Bar", () => {
		it("marks previous steps as done, current step as active, and future steps as inactive", () => {
			const currentStepIndex = 2;

			render(
				<WizardHeader
					applicationName="Test Grant Application"
					currentStep={currentStepIndex}
					showHeaderInfo={true}
					stepTitles={mockStepTitles}
				/>,
			);

			const stepIndicators = screen.getByTestId("step-indicators");
			expect(stepIndicators).toBeInTheDocument();

			mockStepTitles.forEach((_, index) => {
				const stepElement = screen.getByTestId(`step-${index}`);
				expect(stepElement).toBeInTheDocument();

				if (index < currentStepIndex) {
					expect(stepElement.querySelector('[data-testid="step-done"]')).toBeInTheDocument();
				} else if (index === currentStepIndex) {
					expect(stepElement.querySelector('[data-testid="step-active"]')).toBeInTheDocument();
				} else {
					expect(stepElement.querySelector('[data-testid="step-inactive"]')).toBeInTheDocument();
				}
			});
		});
	});
	describe("StepIndicator - Icon Selection Based on Step State", () => {
		it("renders IconApplicationStepDone for completed steps showing accomplishment", () => {
			const { container } = render(
				<div data-testid="wrapper">
					<StepIndicator isLastStep={false} type="done" />
				</div>,
			);

			const stepIndicator = screen.getByTestId("step-done");
			expect(stepIndicator).toBeInTheDocument();

			const doneIcon = container.querySelector('[data-testid="icon-application-step-done"]');
			expect(doneIcon).toBeInTheDocument();

			const activeIcon = container.querySelector('[data-testid="icon-application-step-active"]');
			expect(activeIcon).not.toBeInTheDocument();

			const inactiveIcon = container.querySelector('[data-testid="icon-application-step-inactive"]');
			expect(inactiveIcon).not.toBeInTheDocument();
		});

		it("renders IconApplicationStepActive for current step highlighting user's position", () => {
			const { container } = render(
				<div data-testid="wrapper">
					<StepIndicator isLastStep={false} type="active" />
				</div>,
			);

			const stepIndicator = screen.getByTestId("step-active");
			expect(stepIndicator).toBeInTheDocument();

			const activeIcon = container.querySelector('[data-testid="icon-application-step-active"]');
			expect(activeIcon).toBeInTheDocument();

			const doneIcon = container.querySelector('[data-testid="icon-application-step-done"]');
			expect(doneIcon).not.toBeInTheDocument();

			const inactiveIcon = container.querySelector('[data-testid="icon-application-step-inactive"]');
			expect(inactiveIcon).not.toBeInTheDocument();
		});

		it("renders IconApplicationStepInActive for future steps indicating upcoming work", () => {
			const { container } = render(
				<div data-testid="wrapper">
					<StepIndicator isLastStep={false} type="inactive" />
				</div>,
			);

			const stepIndicator = screen.getByTestId("step-inactive");
			expect(stepIndicator).toBeInTheDocument();

			const inactiveIcon = container.querySelector('[data-testid="icon-application-step-inactive"]');
			expect(inactiveIcon).toBeInTheDocument();

			const doneIcon = container.querySelector('[data-testid="icon-application-step-done"]');
			expect(doneIcon).not.toBeInTheDocument();

			const activeIcon = container.querySelector('[data-testid="icon-application-step-active"]');
			expect(activeIcon).not.toBeInTheDocument();
		});
	});
});
