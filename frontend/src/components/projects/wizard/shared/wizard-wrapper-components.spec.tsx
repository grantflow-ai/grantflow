import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantTemplateFactory,
	RagSourceFactory,
} from "::testing/factories";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useWizardDialog } from "@/hooks/use-wizard-dialog";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { getStepIcon, StepIndicator, WizardFooter, WizardHeader } from "./wizard-wrapper-components";

vi.mock("@/hooks/use-wizard-dialog", () => ({
	useWizardDialog: vi.fn(),
}));

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

describe("getStepIcon", () => {
	it("returns done icon for done status", () => {
		const icon = getStepIcon("done");
		expect(icon.props.alt).toBe("Step done");
		expect(icon.props.src).toBe("/icons/application-step-done.svg");
	});

	it("returns active icon for active status", () => {
		const icon = getStepIcon("active");
		expect(icon.props.alt).toBe("Step active");
		expect(icon.props.src).toBe("/icons/application-step-active.svg");
	});

	it("returns inactive icon for inactive status", () => {
		const icon = getStepIcon("inactive");
		expect(icon.props.alt).toBe("Step inactive");
		expect(icon.props.src).toBe("/icons/application-step-inactive.svg");
	});
});

describe("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	const mockCloseDialog = vi.fn();
	const mockOpenDialog = vi.fn();

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		useWizardStore.getState().reset();
		useApplicationStore.getState().reset();

		(useWizardDialog as any).mockReturnValue({
			closeDialog: mockCloseDialog,
			openDialog: mockOpenDialog,
		});

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

			// Use getAllByTestId to handle multiple renders (possibly due to StrictMode)
			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Approve and Continue");
		});

		it("displays generation action on generate and complete step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Generate");
		});

		it("displays standard next action on other steps", () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Next");
		});
	});

	describe("Button State Management", () => {
		it("enables continue button when step validation passes", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
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

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toBeDisabled();
		});

		it("disables continue button when title is too short", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [RagSourceFactory.build()],
				}),
				title: "Short",
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toBeDisabled();
		});

		it("disables continue button when no RAG sources", () => {
			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [],
				}),
				title: "This is a valid title with enough length",
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toBeDisabled();
		});
	});

	describe("Dialog Integration", () => {
		it("opens dialog when continue clicked and has in-process template sources", async () => {
			const user = userEvent.setup();

			// Set up application state with in-process sources
			const applicationWithInProcessSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							sourceId: "source-1",
							status: "INDEXING",
							url: "https://example.com",
						}),
					],
				}),
				title: "Test Application with enough length",
			});

			useApplicationStore.setState({
				application: applicationWithInProcessSources,
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);
			const continueButtons = screen.getAllByTestId("continue-button");
			await user.click(continueButtons[0]);

			expect(mockOpenDialog).toHaveBeenCalledWith(
				"Review Required: Some Uploads Failed",
				expect.any(Object),
				expect.objectContaining({
					description:
						"We couldn't process one or more of your files or links. To ensure accurate analysis, please upload all required documents.",
					footer: expect.any(Object),
				}),
			);
		});

		it("proceeds to next step directly when no in-process template sources", async () => {
			const user = userEvent.setup();
			const mockToNextStep = vi.fn();

			// Set up application state with completed sources (no in-process)
			const applicationWithCompletedSources = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					rag_sources: [
						RagSourceFactory.build({
							sourceId: "source-1",
							status: "FINISHED",
							url: "https://example.com",
						}),
					],
				}),
				title: "Test Application with enough length",
			});

			useApplicationStore.setState({
				application: applicationWithCompletedSources,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				toNextStep: mockToNextStep,
			});

			render(<WizardFooter />);
			const continueButtons = screen.getAllByTestId("continue-button");
			await user.click(continueButtons[0]);

			expect(mockToNextStep).toHaveBeenCalledOnce();
			expect(mockOpenDialog).not.toHaveBeenCalled();
		});
	});
});

describe("WizardHeader", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

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

			const appNames = screen.getAllByTestId("app-name");
			expect(appNames[0]).toHaveTextContent("Test Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("truncates long application title", () => {
			const longTitle = "A".repeat(130);
			const application = ApplicationFactory.build({
				title: longTitle,
			});

			useApplicationStore.setState({
				application,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});

			render(<WizardHeader />);

			const appNames = screen.getAllByTestId("app-name");
			expect(appNames[0].textContent).toContain("...");
			expect(appNames[0].textContent?.length).toBeLessThan(longTitle.length);
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

			expect(mockPush).toHaveBeenCalledWith("/project");
		});

		it("navigates to projects list if no application available", () => {
			useApplicationStore.setState({
				application: null,
				areAppOperationsInProgress: false,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			fireEvent.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/project");
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
