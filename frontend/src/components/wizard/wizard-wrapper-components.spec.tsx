import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { StepIndicator, WizardFooter, WizardHeader } from "./wizard-wrapper-components";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useParams: () => ({
		applicationId: "test-application-id",
		projectId: "test-project-id",
	}),
	useRouter: () => ({
		push: mockPush,
	}),
}));

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	beforeEach(() => {
		useWizardStore.getState().reset();
		useApplicationStore.getState().reset();

		const ragSource = RagSourceFactory.build({
			sourceId: "source-1",
			status: "FINISHED",
			url: "https://example.com",
		});

		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				grant_sections: [],
				id: "template-id",
				rag_sources: [ragSource],
			}),
			title: "A".repeat(20),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});
	});

	describe("Navigation Button Visibility", () => {
		it("displays back button for steps after the first", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardFooter />);

			expect(screen.getByTestId("back-button")).toBeInTheDocument();
		});

		it("hides back button on the first step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});
			render(<WizardFooter />);

			expect(screen.queryByTestId("back-button")).not.toBeInTheDocument();
		});
	});

	describe("Action Button Configuration", () => {
		it("displays approval action on step 2", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Approve and Continue");
		});

		it("displays generation action on final step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Generate");
		});

		it("displays standard next action on other steps", () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Next");
		});
	});

	describe("Button State Management", () => {
		it("enables continue button when step validation passes", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();
		});

		it("disables continue button when step validation fails", () => {
			const application = ApplicationFactory.build({
				grant_template: undefined,
				rag_sources: [],
				title: "Short",
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toBeDisabled();
		});
	});
});

describe("WizardHeader", () => {
	beforeEach(() => {
		useWizardStore.getState().reset();
		useApplicationStore.getState().reset();

		const application = ApplicationFactory.build({
			title: "Test Application",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});
	});

	describe("Header Information Display", () => {
		it("shows application name and deadline after first step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardHeader />);

			expect(screen.getByTestId("app-name")).toHaveTextContent("Test Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("hides application info on first step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});
			render(<WizardHeader />);

			expect(screen.queryByTestId("app-name")).not.toBeInTheDocument();
			expect(screen.queryByTestId("deadline-component")).not.toBeInTheDocument();
		});
	});

	describe("Progress Bar Display", () => {
		it("always displays step indicators", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("step-indicators")).toBeInTheDocument();
		});

		it("displays exit button", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		});
	});

	describe("Exit Button Functionality", () => {
		beforeEach(() => {
			mockPush.mockClear();
		});

		it("resets wizard store and navigates to project page when exit button is clicked", () => {
			const application = ApplicationFactory.build({
				project_id: "test-project-id",
				title: "Test Application",
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: true,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			fireEvent.click(exitButton);

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
			expect(useWizardStore.getState().isGeneratingTemplate).toBe(false);

			expect(mockPush).toHaveBeenCalledWith("/projects/test-project-id");
		});

		it("navigates to projects list if no project_id available", () => {
			const application = ApplicationFactory.build({
				project_id: undefined,
				title: "Test Application",
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			fireEvent.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/projects");
		});

		it("navigates to projects list if no application available", () => {
			useApplicationStore.setState({
				application: null,
				areAppOperationsInProgress: false,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			fireEvent.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/projects");
		});
	});
});

describe("StepIndicator", () => {
	it("renders active step indicator", () => {
		render(<StepIndicator isLastStep={false} type="active" />);

		expect(screen.getByTestId("step-active")).toBeInTheDocument();
	});

	it("renders done step indicator", () => {
		render(<StepIndicator isLastStep={false} type="done" />);

		expect(screen.getByTestId("step-done")).toBeInTheDocument();
	});

	it("renders inactive step indicator", () => {
		render(<StepIndicator isLastStep={false} type="inactive" />);

		expect(screen.getByTestId("step-inactive")).toBeInTheDocument();
	});
});