/* eslint-disable vitest/expect-expect */
import { setupAnalyticsMocks } from "::testing/analytics-test-utils";
import { ApplicationFactory, GrantTemplateFactory } from "::testing/factories";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import { TrackingEvents } from "@/utils/tracking";
import { ApplicationDetailsValidationReason } from "@/utils/wizard-validation";
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

vi.mock("@/utils/segment", () => ({
	analyticsIdentify: vi.fn().mockResolvedValue(undefined),
	getAnalytics: vi.fn(),
	trackWizardEvent: vi.fn().mockResolvedValue(undefined),
}));

describe.sequential("WizardFooter - Grant Application Wizard Navigation Controls", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	beforeEach(() => {
		vi.clearAllMocks();
		useWizardStore.getState().reset();
		useApplicationStore.getState().reset();

		const application = ApplicationFactory.build({
			title: "Test Application Title",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});
	});

	describe.sequential("Navigation Button Visibility", () => {
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

	describe.sequential("Action Button Configuration", () => {
		it("displays approval action on step 2", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Approve and Continue");
		});

		it("displays generate action on research deep dive step when no application text exists", () => {
			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
			});
			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [],
					}),
					text: undefined,
				},
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Generate");
		});

		it("displays next action on research deep dive step when application text exists", () => {
			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
			});
			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [],
					}),
					text: "Existing application text",
				},
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Next");
		});

		it("displays go to dashboard action on generate and complete step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
			});
			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).toHaveTextContent("Go To Dashboard");
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

	describe.sequential("Button State Management", () => {
		it("keeps continue button enabled when step validation fails", () => {
			const mockValidateStepNext = vi.fn(() => ({ isValid: false, reason: "test validation failed" }));

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: mockValidateStepNext,
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: {
						...ApplicationFactory.build().grant_template!,
						rag_sources: [],
					},
					title: "Short",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("disables back button when template is generating", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: true,
			});

			render(<WizardFooter />);

			const backButton = screen.getByTestId("back-button");
			expect(backButton).toBeDisabled();
		});

		it("keeps continue button enabled when RAG sources are not processed (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "INDEXING" },
							{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
						],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("enables continue button when RAG sources are processed (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
							{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
						],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("enables continue button with mixed FINISHED and FAILED RAG sources (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
							{ filename: "test2.pdf", sourceId: "2", status: "FAILED" },
						],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("keeps continue button enabled when RAG sources are CREATED (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "CREATED" },
							{ filename: "test2.pdf", sourceId: "2", status: "FINISHED" },
						],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("keeps continue button enabled with no RAG sources (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("keeps continue button enabled with no grant template (APPLICATION_DETAILS)", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: undefined,
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});

		it("uses local validation only for APPLICATION_DETAILS step", () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [{ id: "1", order: 0, parent_id: null, title: "Test Section" }],
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "INDEXING" },
							{ filename: "test2.pdf", sourceId: "2", status: "CREATED" },
						],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButtons = screen.getAllByTestId("continue-button");
			expect(continueButtons[0]).not.toBeDisabled();
		});
	});

	describe.sequential("Tooltip Functionality", () => {
		it("does not display tooltip - buttons are always enabled", async () => {
			const user = userEvent.setup();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: GrantTemplateFactory.build({
						grant_sections: [],
						rag_sources: [],
					}),
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.hover(continueButton.parentElement!);
			await waitFor(() => {
				expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
			});
		});

		it("does not display tooltip for processing RAG sources - buttons are always enabled", async () => {
			const user = userEvent.setup();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: {
						created_at: new Date().toISOString(),
						grant_application_id: "test-app-id",
						grant_sections: [],
						id: "test-template-id",
						rag_sources: [
							{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" },
							{ filename: "test2.pdf", sourceId: "2", status: "INDEXING" },
							{ filename: "test3.pdf", sourceId: "3", status: "CREATED" },
						],
						updated_at: new Date().toISOString(),
					},
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.hover(continueButton.parentElement!);
			await waitFor(() => {
				expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
			});
		});

		it("does not display tooltip for invalid title - buttons are always enabled", async () => {
			const user = userEvent.setup();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: {
						created_at: new Date().toISOString(),
						grant_application_id: "test-app-id",
						grant_sections: [],
						id: "test-template-id",
						rag_sources: [{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" }],
						updated_at: new Date().toISOString(),
					},
					title: "Short",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.hover(continueButton.parentElement!);
			await waitFor(() => {
				expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
			});
		});

		it("does not display tooltip for enabled button on APPLICATION_DETAILS step", async () => {
			const user = userEvent.setup();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: {
						created_at: new Date().toISOString(),
						grant_application_id: "test-app-id",
						grant_sections: [],
						id: "test-template-id",
						rag_sources: [{ filename: "test1.pdf", sourceId: "1", status: "FINISHED" }],
						updated_at: new Date().toISOString(),
					},
					title: "This is a valid title that meets minimum requirements",
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.hover(continueButton);

			expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		});

		it("does not display tooltip on non-APPLICATION_DETAILS steps", async () => {
			const user = userEvent.setup();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				validateStepNext: vi.fn(() => ({ isValid: false, reason: "test validation failed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					grant_template: {
						...ApplicationFactory.build().grant_template!,
						grant_sections: [],
					},
				},
				areAppOperationsInProgress: false,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.hover(continueButton);

			expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		});
	});

	describe.sequential("Button Click Behavior", () => {
		it("calls toNextStep when continue button is clicked on regular steps", async () => {
			const user = userEvent.setup();
			const mockToNextStep = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
				toNextStep: mockToNextStep,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					rag_sources: [
						{
							filename: "test-file.pdf",
							sourceId: "test-source-id",
							status: "FINISHED",
							url: undefined,
						},
					],
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.click(continueButton);
			expect(mockToNextStep).toHaveBeenCalledOnce();
		});

		it("calls generateApplication when Generate button is clicked on RESEARCH_DEEP_DIVE step", async () => {
			const user = userEvent.setup();
			const mockGenerateApplication = vi.fn().mockResolvedValue(true);
			const mockToNextStep = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				generateApplication: mockGenerateApplication,
				isGeneratingApplication: false,
				toNextStep: mockToNextStep,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					form_inputs: {
						background_context: "Test background context",
						hypothesis: "Test hypothesis",
						impact: "Test impact",
						novelty_and_innovation: "Test novelty and innovation",
						preliminary_data: "Test preliminary data",
						rationale: "Test rationale",
						research_feasibility: "Test research feasibility",
						team_excellence: "Test team excellence",
					},
					text: undefined,
				},
			});

			render(<WizardFooter />);

			const generateButton = screen.getByTestId("continue-button");
			expect(generateButton).toHaveTextContent("Generate");

			await user.click(generateButton);

			await waitFor(() => {
				expect(mockGenerateApplication).toHaveBeenCalledOnce();
				expect(mockToNextStep).toHaveBeenCalledOnce();
			});
		});

		it("calls toNextStep directly when Next button is clicked on RESEARCH_DEEP_DIVE with existing text", async () => {
			const user = userEvent.setup();
			const mockToNextStep = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				toNextStep: mockToNextStep,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					form_inputs: {
						background_context: "Background context text",
						hypothesis: "Hypothesis text",
						impact: "Impact text",
						novelty_and_innovation: "Novelty text",
						preliminary_data: "Preliminary data text",
						rationale: "Rationale text",
						research_feasibility: "Research feasibility text",
						team_excellence: "Team excellence text",
					},
					text: "Existing application text",
				},
			});

			render(<WizardFooter />);

			const nextButton = screen.getByTestId("continue-button");
			expect(nextButton).toHaveTextContent("Next");

			await user.click(nextButton);
			expect(mockToNextStep).toHaveBeenCalledOnce();
		});

		it("navigates to dashboard and resets wizard when Go To Dashboard is clicked", async () => {
			const user = userEvent.setup();
			const mockReset = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.GENERATE_AND_COMPLETE,
				reset: mockReset,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			render(<WizardFooter />);

			const dashboardButton = screen.getByTestId("continue-button");
			expect(dashboardButton).toHaveTextContent("Go To Dashboard");

			await user.click(dashboardButton);

			expect(mockPush).toHaveBeenCalledWith("/organization");

			await waitFor(
				() => {
					expect(mockReset).toHaveBeenCalledOnce();
				},
				{ timeout: 1500 },
			);
		});

		it("calls toPreviousStep when back button is clicked", async () => {
			const user = userEvent.setup();
			const mockToPreviousStep = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				toPreviousStep: mockToPreviousStep,
			});

			render(<WizardFooter />);

			const backButton = screen.getByTestId("back-button");
			await user.click(backButton);

			expect(mockToPreviousStep).toHaveBeenCalledOnce();
		});

		it("does not call generateApplication again when generation fails", async () => {
			const user = userEvent.setup();
			const mockGenerateApplication = vi.fn().mockResolvedValue(false);
			const mockToNextStep = vi.fn();

			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				generateApplication: mockGenerateApplication,
				toNextStep: mockToNextStep,
				validateStepNext: vi.fn(() => ({ isValid: true, reason: "test validation passed" })),
			});

			useApplicationStore.setState({
				application: {
					...ApplicationFactory.build(),
					form_inputs: {
						background_context: "Background context text",
						hypothesis: "Hypothesis text",
						impact: "Impact text",
						novelty_and_innovation: "Novelty text",
						preliminary_data: "Preliminary data text",
						rationale: "Rationale text",
						research_feasibility: "Research feasibility text",
						team_excellence: "Team excellence text",
					},
					text: undefined,
				},
			});

			render(<WizardFooter />);

			const generateButton = screen.getByTestId("continue-button");
			await user.click(generateButton);

			await waitFor(() => {
				expect(mockGenerateApplication).toHaveBeenCalledOnce();
				expect(mockToNextStep).not.toHaveBeenCalled();
			});
		});
	});
});

describe.sequential("WizardHeader", () => {
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

	describe.sequential("Header Information Display", () => {
		it("shows application name and deadline after first step", () => {
			const applicationWithDeadline = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					submission_date: new Date("2025-12-31").toISOString(),
				}),
				title: "Test Application",
			});

			useApplicationStore.setState({
				application: applicationWithDeadline,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardHeader />);

			const appNames = screen.getAllByTestId("app-name");
			expect(appNames[0]).toHaveTextContent("Test Application");
			expect(screen.getByTestId("deadline-component")).toBeInTheDocument();
		});

		it("does not show deadline component when no submission date is set", () => {
			const applicationWithoutDeadline = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					submission_date: undefined,
				}),
				title: "Test Application",
			});

			useApplicationStore.setState({
				application: applicationWithoutDeadline,
				areAppOperationsInProgress: false,
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});
			render(<WizardHeader />);

			const appNames = screen.getAllByTestId("app-name");
			expect(appNames[0]).toHaveTextContent("Test Application");
			expect(screen.queryByTestId("deadline-component")).not.toBeInTheDocument();
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
			expect(appNames[0].textContent.length).toBeLessThan(longTitle.length);
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

	describe.sequential("Progress Bar Display", () => {
		it("always displays step indicators", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("step-indicators")).toBeInTheDocument();
		});

		it("displays exit button", () => {
			render(<WizardHeader />);

			expect(screen.getByTestId("exit-button")).toBeInTheDocument();
		});
	});

	describe.sequential("Exit Button Functionality", () => {
		beforeEach(() => {
			mockPush.mockClear();
		});

		it("resets wizard store and navigates to project page when exit button is clicked", async () => {
			const user = userEvent.setup();
			const mockReset = vi.fn();

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
				reset: mockReset,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			await user.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/organization/project");

			await waitFor(
				() => {
					expect(mockReset).toHaveBeenCalledOnce();
				},
				{ timeout: 1500 },
			);
		});

		it("navigates to projects list if no project_id available", async () => {
			const user = userEvent.setup();
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
			await user.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/organization/project");
		});

		it("navigates to projects list if no application available", async () => {
			const user = userEvent.setup();
			useApplicationStore.setState({
				application: null,
				areAppOperationsInProgress: false,
			});

			render(<WizardHeader />);

			const exitButton = screen.getByTestId("exit-button");
			await user.click(exitButton);

			expect(mockPush).toHaveBeenCalledWith("/organization/project");
		});
	});
});

describe.sequential("StepIndicator", () => {
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

describe("WizardFooter - Analytics Tracking", () => {
	const { expectEventTracked, expectNoEventsTracked, resetAnalyticsMocks } = setupAnalyticsMocks();
	const user = userEvent.setup();

	beforeEach(() => {
		resetAnalyticsMocks();
		vi.clearAllMocks();
		useWizardStore.getState().reset();
		useApplicationStore.getState().reset();

		useOrganizationStore.setState({
			selectedOrganizationId: "org-123",
		});

		const application = ApplicationFactory.build({
			grant_template: GrantTemplateFactory.build({
				grant_sections: [
					{ id: "section-1", order: 1, parent_id: null, title: "Section 1" },
					{ id: "section-2", order: 2, parent_id: null, title: "Section 2" },
				],
				id: "template-123",
				rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
			}),
			id: "app-123",
			project_id: "proj-123",
			title: "Test Application Title",
		});

		useApplicationStore.setState({
			application,
			areAppOperationsInProgress: false,
		});

		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
			validateStepNext: vi.fn(() => ({
				isValid: true,
				reason: ApplicationDetailsValidationReason.VALID,
			})),
		});
	});

	describe("Navigation tracking", () => {
		it("tracks STEP_1_NEXT when continuing from Application Details", async () => {
			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_STEP_1_NEXT, {
					applicationId: "app-123",
					organizationId: "org-123",
					projectId: "proj-123",
				});
			});
		});

		it("tracks STEP_3_NEXT when continuing from Knowledge Base", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.KNOWLEDGE_BASE,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_STEP_3_NEXT, {});
			});
		});

		it("tracks STEP_4_NEXT when continuing from Research Plan", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_PLAN,
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					research_objectives: [
						{
							number: 1,
							research_tasks: [
								{ description: "Test task 1", number: 1, title: "Test task 1" },
								{ description: "Test task 2", number: 2, title: "Test task 2" },
							],
							title: "Test objective",
						},
					],
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_STEP_4_NEXT, {});
			});
		});

		it("tracks back navigation", async () => {
			const toPreviousStepSpy = vi.fn(() => {
				useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });
			});

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
				isGeneratingTemplate: false,
				toPreviousStep: toPreviousStepSpy,
			});

			render(<WizardFooter />);

			const backButton = screen.getByTestId("back-button");
			await user.click(backButton);

			await waitFor(() => {
				expect(toPreviousStepSpy).toHaveBeenCalled();
				expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
				expectNoEventsTracked();
			});
		});
	});

	describe("Approval tracking", () => {
		it("tracks STEP_2_APPROVE when approving application structure", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_STRUCTURE,
			});

			render(<WizardFooter />);

			const approveButton = screen.getByTestId("continue-button");
			await user.click(approveButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_STEP_2_APPROVE, {
					sectionsCount: 2,
					templateId: "template-123",
				});
			});
		});
	});

	describe("Generation tracking", () => {
		it("tracks STEP_5_GENERATE when generating application from Research Deep Dive", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
				generateApplication: vi.fn().mockResolvedValue(true),
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					form_inputs: {
						background_context: "Background context text",
						hypothesis: "Hypothesis text",
						impact: "Impact text",
						novelty_and_innovation: "Novelty text",
						preliminary_data: "Preliminary data text",
						rationale: "Rationale text",
						research_feasibility: "Research feasibility text",
						team_excellence: "Team excellence text",
					},
					text: "",
				},
			});

			render(<WizardFooter />);

			const generateButton = screen.getByTestId("continue-button");
			expect(generateButton).toHaveTextContent("Generate");

			await user.click(generateButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_STEP_5_GENERATE, {
					generationType: "application",
				});
			});
		});

		it("does not track generation when application text already exists", async () => {
			useWizardStore.setState({
				currentStep: WizardStep.RESEARCH_DEEP_DIVE,
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					text: "Existing application text",
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).toHaveTextContent("Next");

			await user.click(continueButton);

			await waitFor(() => {
				const events = vi.mocked(setupAnalyticsMocks().mockTrackEvent).mock.calls;
				const generationEvent = events.find(([event]) => event === TrackingEvents.WIZARD_STEP_5_GENERATE);
				expect(generationEvent).toBeUndefined();
			});
		});
	});

	describe("Error tracking", () => {
		it("tracks ERROR_CONTINUE when validation fails on next", async () => {
			const validateStepNextSpy = vi.fn(() => ({
				isValid: false,
				reason: ApplicationDetailsValidationReason.RAG_SOURCES_MISSING,
			}));

			useWizardStore.setState({
				validateStepNext: validateStepNextSpy,
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					grant_template: {
						...useApplicationStore.getState().application!.grant_template!,
						rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
					},
					title: "Valid Long Title for Testing",
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_ERROR_CONTINUE, {
					errorType: "validation",
					validationErrors: ["rag-sources-missing"],
				});
			});
		});

		it("tracks validation error details for missing title", async () => {
			const user = userEvent.setup();

			const validateStepNextSpy = vi.fn(() => ({
				isValid: false,
				reason: ApplicationDetailsValidationReason.TITLE_INVALID,
			}));

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: validateStepNextSpy,
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					grant_template: {
						...useApplicationStore.getState().application!.grant_template!,
						rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
					},
					title: "Valid Long Title for Testing",
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_ERROR_CONTINUE, {
					errorType: "validation",
					validationErrors: expect.arrayContaining(["title-invalid"]),
				});
			});
		});

		it("tracks validation error for missing RAG sources", async () => {
			const user = userEvent.setup();

			const validateStepNextSpy = vi.fn(() => ({
				isValid: false,
				reason: ApplicationDetailsValidationReason.RAG_SOURCES_MISSING,
			}));

			useWizardStore.setState({
				currentStep: WizardStep.APPLICATION_DETAILS,
				validateStepNext: validateStepNextSpy,
			});

			useApplicationStore.setState({
				application: {
					...useApplicationStore.getState().application!,
					grant_template: {
						...useApplicationStore.getState().application!.grant_template!,
						rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
					},
					title: "Valid Long Title for Testing",
				},
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			expect(continueButton).not.toBeDisabled();

			await user.click(continueButton);

			await waitFor(() => {
				expectEventTracked(TrackingEvents.WIZARD_ERROR_CONTINUE, {
					errorType: "validation",
					validationErrors: expect.arrayContaining(["rag-sources-missing"]),
				});
			});
		});
	});

	describe("Context validation", () => {
		it("does not track events when organizationId is missing", async () => {
			useOrganizationStore.setState({
				selectedOrganizationId: null,
			});

			render(<WizardFooter />);

			const continueButton = screen.getByTestId("continue-button");
			await user.click(continueButton);

			await waitFor(() => {
				expectNoEventsTracked();
			});
		});
	});
});
