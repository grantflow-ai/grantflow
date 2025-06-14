import { render, screen } from "@testing-library/react";

import { ApplicationFactory } from "::testing/factories";
import { useWizardStore } from "@/stores/wizard-store";

import { StepIndicator, WizardFooter, WizardHeader } from "./wizard-wrapper-components";

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	describe("Navigation Button Visibility - Conditional Back Button Display", () => {
		it("displays back button for steps after the first to enable backward navigation", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({ application, currentStep: 1 });
			render(<WizardFooter />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("hides back button on the first step to enforce linear progression through the wizard", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({ application, currentStep: 0 });
			render(<WizardFooter />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Action Button Configuration - Context-Aware Button Text and Icons", () => {
		it("displays approval action on step 2 with 'Approve and Continue' text and approval/forward icons", () => {
			const application = ApplicationFactory.build();
			useWizardStore.setState({ application, currentStep: 1 });
			const { container } = render(<WizardFooter />);

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
			const application = ApplicationFactory.build();
			useWizardStore.setState({ application, currentStep: 5 });
			const { container } = render(<WizardFooter />);

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
			const application = ApplicationFactory.build();
			useWizardStore.setState({ application, currentStep: 2 });
			const { container } = render(<WizardFooter />);

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
		"Application Structure",
		"Knowledge Base",
		"Research Plan",
		"Research Deep Dive",
		"Generate and Complete",
	] as const;

	describe("Header Info Visibility", () => {
		it("shows application name and deadline when header info is visible", () => {
			useWizardStore.setState({ applicationTitle: "Test Grant Application", currentStep: 1 });
			render(<WizardHeader />);

			expect(screen.getByTestId("app-name")).toBeInTheDocument();
			expect(screen.getByTestId("app-name")).toHaveTextContent("Test Grant Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("hides application name and deadline when header info is not visible", () => {
			useWizardStore.setState({ applicationTitle: "Test Grant Application", currentStep: 0 });
			render(<WizardHeader />);

			expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();
			expect(screen.queryByTestId("deadline-component")).not.toBeInTheDocument();
		});
	});

	describe("Step Indicators in Progress Bar", () => {
		it("marks previous steps as done, current step as active, and future steps as inactive", () => {
			const currentStepIndex = 2;

			useWizardStore.setState({ applicationTitle: "Test Grant Application", currentStep: currentStepIndex });
			render(<WizardHeader />);

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
