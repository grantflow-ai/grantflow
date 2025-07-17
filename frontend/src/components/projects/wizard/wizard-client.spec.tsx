import { ApplicationFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { WizardClientComponent } from "./wizard-client";

const mockNotifications = vi.fn();
const mockIsRagProcessingStatusMessage = vi.fn();
const mockIsSourceProcessingNotificationMessage = vi.fn();
const mockIsAutofillProgressMessage = vi.fn();

vi.mock("@/hooks/use-application-notifications", () => ({
	isAutofillProgressMessage: mockIsAutofillProgressMessage,
	isRagProcessingStatusMessage: mockIsRagProcessingStatusMessage,
	isSourceProcessingNotificationMessage: mockIsSourceProcessingNotificationMessage,
	useApplicationNotifications: () => ({
		connectionStatus: "Connected",
		connectionStatusColor: "green",
		notifications: mockNotifications(),
	}),
}));

vi.mock("@/components/projects/shared/notification-handler", () => ({
	NotificationHandler: () => <div data-testid="notification-handler" />,
}));

vi.mock("@/components/projects/wizard", () => ({
	ApplicationDetailsStep: () => <div data-testid="application-details-step" />,
	ApplicationStructureStep: () => <div data-testid="application-structure-step" />,
	GenerateCompleteStep: () => <div data-testid="generate-complete-step" />,
	KnowledgeBaseStep: () => <div data-testid="knowledge-base-step" />,
	ResearchDeepDiveStep: () => <div data-testid="research-deep-dive-step" />,
	ResearchPlanStep: () => <div data-testid="research-plan-step" />,
}));

vi.mock("@/components/projects/wizard/shared", () => ({
	WizardFooter: () => <div data-testid="wizard-footer" />,
	WizardHeader: () => <div data-testid="wizard-header" />,
}));

vi.mock("@/components/projects/wizard/shared/wizard-dialog", () => ({
	WizardDialog: () => <div data-testid="wizard-dialog" />,
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

describe("WizardClientComponent", () => {
	const mockApplication = ApplicationFactory.build();
	const projectId = "test-project-id";

	beforeEach(() => {
		vi.clearAllMocks();

		useApplicationStore.getState().reset();
		useWizardStore.getState().reset();

		mockNotifications.mockReturnValue([]);
		mockIsRagProcessingStatusMessage.mockReturnValue(false);
		mockIsSourceProcessingNotificationMessage.mockReturnValue(false);
		mockIsAutofillProgressMessage.mockReturnValue(false);
	});

	it("should render wizard layout with header and footer", () => {
		render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
	});

	it("should render wizard dialog", () => {
		render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(screen.getByTestId("wizard-dialog")).toBeInTheDocument();
	});

	it("should render application details step by default", () => {
		render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
	});

	it("should render different steps based on wizard store state", () => {
		const { rerender } = render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });

		rerender(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
	});

	it("should initialize application store with provided application", () => {
		const resetSpy = vi.spyOn(useApplicationStore.getState(), "reset");
		const setStateSpy = vi.spyOn(useApplicationStore, "setState");

		render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(resetSpy).toHaveBeenCalled();
		expect(setStateSpy).toHaveBeenCalledWith({
			application: mockApplication,
			areAppOperationsInProgress: false,
		});
	});

	it("should initialize wizard store", () => {
		const resetSpy = vi.spyOn(useWizardStore.getState(), "reset");

		render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

		expect(resetSpy).toHaveBeenCalled();
	});

	it("should render all step components correctly", () => {
		const stepTests = [
			{ step: WizardStep.APPLICATION_DETAILS, testId: "application-details-step" },
			{ step: WizardStep.APPLICATION_STRUCTURE, testId: "application-structure-step" },
			{ step: WizardStep.KNOWLEDGE_BASE, testId: "knowledge-base-step" },
			{ step: WizardStep.RESEARCH_PLAN, testId: "research-plan-step" },
			{ step: WizardStep.RESEARCH_DEEP_DIVE, testId: "research-deep-dive-step" },
			{ step: WizardStep.GENERATE_AND_COMPLETE, testId: "generate-complete-step" },
		];

		stepTests.forEach(({ step, testId }) => {
			const { rerender, unmount } = render(
				<WizardClientComponent application={mockApplication} projectId={projectId} />,
			);

			useWizardStore.setState({ currentStep: step });
			rerender(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(screen.getByTestId(testId)).toBeInTheDocument();
			unmount();
		});
	});

	describe("Notification Handling", () => {
		it("should handle source processing notifications", () => {
			const mockNotification = {
				data: {
					identifier: "test-file.pdf",
					indexing_status: SourceIndexingStatus.FINISHED,
				},
			};

			mockNotifications.mockReturnValue([mockNotification]);
			mockIsSourceProcessingNotificationMessage.mockReturnValue(true);

			render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(mockIsSourceProcessingNotificationMessage).toHaveBeenCalledWith(mockNotification);
		});

		it("should handle autofill progress notifications", () => {
			const mockNotification = {
				data: {
					autofill_type: "research_plan",
					message: "Autofill completed successfully",
				},
				event: "autofill_completed",
			};

			mockNotifications.mockReturnValue([mockNotification]);
			mockIsAutofillProgressMessage.mockReturnValue(true);

			render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(mockIsAutofillProgressMessage).toHaveBeenCalledWith(mockNotification);
		});

		it("should handle RAG processing notifications", () => {
			const mockNotification = {
				data: {
					event: "grant_template_generation_started",
				},
			};

			mockNotifications.mockReturnValue([mockNotification]);
			mockIsRagProcessingStatusMessage.mockReturnValue(true);

			render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(mockIsRagProcessingStatusMessage).toHaveBeenCalledWith(mockNotification);
		});

		it("should render notification handler when RAG notification exists", () => {
			const mockNotification = {
				data: {
					event: "grant_template_generation_started",
				},
			};

			mockNotifications.mockReturnValue([mockNotification]);
			mockIsRagProcessingStatusMessage.mockReturnValue(true);

			render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(screen.getByTestId("notification-handler")).toBeInTheDocument();
		});
	});

	describe("Store Initialization", () => {
		it("should initialize stores with correct cleanup", () => {
			const { unmount } = render(<WizardClientComponent application={mockApplication} projectId={projectId} />);

			expect(useApplicationStore.getState().application).toEqual(mockApplication);
			expect(useApplicationStore.getState().areAppOperationsInProgress).toBe(false);

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);

			unmount();

			expect(useWizardStore.getState().currentStep).toBe(WizardStep.APPLICATION_DETAILS);
		});
	});
});
