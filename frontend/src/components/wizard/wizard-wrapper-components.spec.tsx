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

		it("displays generation action on generate and complete step", () => {
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

describe("Deadline Component", () => {
	beforeEach(() => {
		useApplicationStore.getState().reset();
		useWizardStore.getState().reset();

		vi.useFakeTimers();
		vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("displays deadline not set when submission date is missing", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: undefined,
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("Deadline not set");
	});

	it("displays deadline passed when submission date is in the past", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2023-12-31T23:59:59Z", // Yesterday
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("Deadline passed");
	});

	it("displays correct time remaining in days", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2024-01-05T00:00:00Z", // 4 days from now
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("4 days to the deadline");
	});

	it("displays correct time remaining in weeks and days", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2024-01-10T00:00:00Z", // 1 week and 2 days from now
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("1 week and 2 days to the deadline");
	});

	it("displays correct time remaining in weeks only", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2024-01-15T00:00:00Z", // Exactly 2 weeks from now
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("2 weeks to the deadline");
	});

	it("handles singular form for 1 day", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2024-01-02T00:00:00Z", // 1 day from now
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("1 day to the deadline");
	});

	it("handles singular form for 1 week", () => {
		const application = ApplicationWithTemplateFactory.build({
			grant_template: GrantTemplateFactory.build({
				submission_date: "2024-01-08T00:00:00Z", // Exactly 1 week from now
			}),
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("deadline-component")).toHaveTextContent("1 week to the deadline");
	});
});

describe("Progress Titles", () => {
	beforeEach(() => {
		useApplicationStore.getState().reset();
		useWizardStore.getState().reset();

		const application = ApplicationFactory.build({
			title: "Test Application",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});
	});

	it("displays all step titles", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("step-title-0")).toBeInTheDocument();
		expect(screen.getByTestId("step-title-1")).toBeInTheDocument();
		expect(screen.getByTestId("step-title-2")).toBeInTheDocument();
		expect(screen.getByTestId("step-title-3")).toBeInTheDocument();
		expect(screen.getByTestId("step-title-4")).toBeInTheDocument();
		expect(screen.getByTestId("step-title-5")).toBeInTheDocument();
	});
});

describe("Footer Button Configuration", () => {
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
	});

	it("disables back button during template generation", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
			isGeneratingTemplate: true,
		});

		render(<WizardFooter />);

		const backButton = screen.getByTestId("back-button");
		expect(backButton).toBeDisabled();
	});

	it("enables back button when not generating template", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
			isGeneratingTemplate: false,
		});

		render(<WizardFooter />);

		const backButton = screen.getByTestId("back-button");
		expect(backButton).not.toBeDisabled();
	});
});

describe("Exit Button Text", () => {
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
	});

	it("shows 'Exit' on first step", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});

		render(<WizardHeader />);

		const exitButton = screen.getByTestId("exit-button");
		expect(exitButton).toHaveTextContent("Exit");
	});

	it("shows 'Save and Exit' on other steps", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_STRUCTURE,
		});

		render(<WizardHeader />);

		const exitButton = screen.getByTestId("exit-button");
		expect(exitButton).toHaveTextContent("Save and Exit");
	});
});

describe("Application Progress Bar", () => {
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
	});

	it("renders correct number of step indicators", () => {
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});

		render(<WizardHeader />);

		expect(screen.getByTestId("step-0")).toBeInTheDocument();
		expect(screen.getByTestId("step-1")).toBeInTheDocument();
		expect(screen.getByTestId("step-2")).toBeInTheDocument();
		expect(screen.getByTestId("step-3")).toBeInTheDocument();
		expect(screen.getByTestId("step-4")).toBeInTheDocument();
		expect(screen.getByTestId("step-5")).toBeInTheDocument();
	});

	it("sets correct aria attributes on progress bar", () => {
		useWizardStore.setState({
			currentStep: WizardStep.KNOWLEDGE_BASE, // Index 2
		});

		render(<WizardHeader />);

		const progressBar = screen.getByTestId("step-indicators");
		expect(progressBar).toHaveAttribute("role", "progressbar");
		expect(progressBar).toHaveAttribute("aria-valuemin", "1");
		expect(progressBar).toHaveAttribute("aria-valuemax", "6");
		expect(progressBar).toHaveAttribute("aria-valuenow", "3"); // 0-indexed + 1
		expect(progressBar).toHaveAttribute("aria-label", "Application wizard progress");
	});

	it("sets correct aria-current attribute on current step", () => {
		useWizardStore.setState({
			currentStep: WizardStep.RESEARCH_PLAN, // Index 3
		});

		render(<WizardHeader />);

		const currentStep = screen.getByTestId("step-3");
		expect(currentStep).toHaveAttribute("aria-current", "step");

		const otherStep = screen.getByTestId("step-2");
		expect(otherStep).not.toHaveAttribute("aria-current");
	});
});
