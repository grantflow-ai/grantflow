import { ApplicationFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { applicationStore } from "@/stores/application-store";
import { wizardStore } from "@/stores/wizard-store";

import { WizardClientComponent } from "./wizard-client";

vi.mock("@/hooks/use-application-notifications", () => ({
	isRagProcessingStatusMessage: vi.fn(),
	isSourceProcessingNotificationMessage: vi.fn(),
	useApplicationNotifications: () => ({
		connectionStatus: "Connected",
		connectionStatusColor: "green",
		notifications: [],
	}),
}));

vi.mock("@/components/workspaces/notification-handler", () => ({
	NotificationHandler: () => <div data-testid="notification-handler" />,
}));

vi.mock("@/components/workspaces/wizard", () => ({
	ApplicationDetailsStep: () => <div data-testid="application-details-step" />,
	ApplicationStructureStep: () => <div data-testid="application-structure-step" />,
	GenerateCompleteStep: () => <div data-testid="generate-complete-step" />,
	KnowledgeBaseStep: () => <div data-testid="knowledge-base-step" />,
	ResearchDeepDiveStep: () => <div data-testid="research-deep-dive-step" />,
	ResearchPlanStep: () => <div data-testid="research-plan-step" />,
}));

vi.mock("@/components/workspaces/wizard-wrapper-components", () => ({
	WizardFooter: () => <div data-testid="wizard-footer" />,
	WizardHeader: () => <div data-testid="wizard-header" />,
}));

describe("WizardClientComponent", () => {
	const mockApplication = ApplicationFactory.build();
	const workspaceId = "test-workspace-id";

	beforeEach(() => {
		vi.clearAllMocks();

		applicationStore.getState().reset();
		wizardStore.getState().reset();
	});

	it("should render wizard layout with header and footer", () => {
		render(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

		expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
		expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
		expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
	});

	it("should render application details step by default", () => {
		render(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

		expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
	});

	it("should render different steps based on wizard store state", () => {
		const { rerender } = render(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

		wizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });

		rerender(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

		expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
	});

	it("should initialize application store with provided application", () => {
		const resetSpy = vi.spyOn(applicationStore.getState(), "reset");
		const setStateSpy = vi.spyOn(applicationStore, "setState");

		render(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

		expect(resetSpy).toHaveBeenCalled();
		expect(setStateSpy).toHaveBeenCalledWith({
			application: mockApplication,
			applicationTitle: mockApplication.title,
			isLoading: false,
		});
	});

	it("should initialize wizard store", () => {
		const resetSpy = vi.spyOn(wizardStore.getState(), "reset");

		render(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

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
				<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />,
			);

			wizardStore.setState({ currentStep: step });
			rerender(<WizardClientComponent application={mockApplication} workspaceId={workspaceId} />);

			expect(screen.getByTestId(testId)).toBeInTheDocument();
			unmount();
		});
	});
});
