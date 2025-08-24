import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { WizardClientComponent } from "./wizard-client";

vi.mock("./index", () => ({
	ApplicationDetailsStep: ({ connectionStatus, connectionStatusColor }: any) => (
		<div data-testid="application-details-step">
			Status: {connectionStatus} - Color: {connectionStatusColor}
		</div>
	),
	ApplicationStructureStep: ({ dialogRef }: any) => (
		<div data-testid="application-structure-step">Dialog ref: {dialogRef ? "present" : "missing"}</div>
	),
	GenerateCompleteStep: () => <div data-testid="generate-complete-step">Generate Complete</div>,
	KnowledgeBaseStep: () => <div data-testid="knowledge-base-step">Knowledge Base</div>,
	ResearchDeepDiveStep: () => <div data-testid="research-deep-dive-step">Research Deep Dive</div>,
	ResearchPlanStep: ({ dialogRef }: any) => (
		<div data-testid="research-plan-step">Dialog ref: {dialogRef ? "present" : "missing"}</div>
	),
}));

vi.mock("./shared", () => ({
	WizardFooter: () => <div data-testid="wizard-footer">Footer</div>,
	WizardHeader: () => <div data-testid="wizard-header">Header</div>,
}));

vi.mock("./wizard-dialog", () => ({
	WizardDialog: () => <div data-testid="wizard-dialog">Dialog</div>,
}));

vi.mock("@/components/shared", () => ({
	NotificationHandler: ({ notification }: any) => (
		<div data-testid="notification-handler">Notification: {notification?.data?.event}</div>
	),
}));

vi.mock("@/hooks/use-application-notifications", () => ({
	isAutofillProgressMessage: () => false,
	isRagProcessingStatusMessage: () => false,
	isSourceProcessingNotificationMessage: () => false,
	useApplicationNotifications: () => ({
		connectionStatus: "connected",
		connectionStatusColor: "green",
		notifications: [],
	}),
}));

const sharedApplication = ApplicationWithTemplateFactory.build();

function renderWizardClient(overrides = {}) {
	const defaultProps = {
		application: sharedApplication,
		organizationId: "org-123",
		projectId: "project-456",
		...overrides,
	};

	return render(<WizardClientComponent {...defaultProps} />);
}

describe.sequential("WizardClientComponent", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
		useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });
	});

	describe("Component Structure", () => {
		it("renders main wizard container", () => {
			renderWizardClient();

			expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		});

		it("renders header and footer components", () => {
			renderWizardClient();

			expect(screen.getByTestId("wizard-header")).toBeInTheDocument();
			expect(screen.getByTestId("wizard-footer")).toBeInTheDocument();
		});

		it("renders step content container", () => {
			renderWizardClient();

			expect(screen.getByTestId("step-content-container")).toBeInTheDocument();
		});

		it("renders wizard dialog component", () => {
			renderWizardClient();

			expect(screen.getByTestId("wizard-dialog")).toBeInTheDocument();
		});
	});

	describe("Step Component Rendering", () => {
		it("renders Application Details step when current step matches", () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_DETAILS });

			renderWizardClient();

			expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			expect(screen.getByTestId("application-details-step")).toHaveTextContent(
				"Status: connected - Color: green",
			);
		});

		it("renders Application Structure step with dialogRef when current step matches", async () => {
			renderWizardClient();

			await waitFor(() => {
				expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			});

			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });

			await waitFor(() => {
				expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
			});
			expect(screen.getByTestId("application-structure-step")).toHaveTextContent("Dialog ref: present");
		});

		it("renders Knowledge Base step when current step matches", async () => {
			renderWizardClient();

			await waitFor(() => {
				expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			});

			useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });

			await waitFor(() => {
				expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
			});
		});

		it("renders Research Plan step with dialogRef when current step matches", async () => {
			renderWizardClient();

			await waitFor(() => {
				expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			});

			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_PLAN });

			await waitFor(() => {
				expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
			});
			expect(screen.getByTestId("research-plan-step")).toHaveTextContent("Dialog ref: present");
		});

		it("renders Research Deep Dive step when current step matches", async () => {
			renderWizardClient();

			await waitFor(() => {
				expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			});

			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_DEEP_DIVE });

			await waitFor(() => {
				expect(screen.getByTestId("research-deep-dive-step")).toBeInTheDocument();
			});
		});

		it("renders Generate Complete step when current step matches", async () => {
			renderWizardClient();

			await waitFor(() => {
				expect(screen.getByTestId("application-details-step")).toBeInTheDocument();
			});

			useWizardStore.setState({ currentStep: WizardStep.GENERATE_AND_COMPLETE });

			await waitFor(() => {
				expect(screen.getByTestId("generate-complete-step")).toBeInTheDocument();
			});
		});
	});

	describe("Store Initialization", () => {
		it("resets stores on component mount", () => {
			const mockApplicationReset = vi.fn();
			const mockWizardReset = vi.fn();

			useApplicationStore.setState({ reset: mockApplicationReset });
			useWizardStore.setState({ reset: mockWizardReset });

			renderWizardClient();

			expect(mockApplicationReset).toHaveBeenCalled();
			expect(mockWizardReset).toHaveBeenCalled();
		});

		it("sets initial application state from props", () => {
			const application = ApplicationWithTemplateFactory.build({ id: "test-app-id" });

			renderWizardClient({ application });

			const currentApplication = useApplicationStore.getState().application;
			expect(currentApplication).toEqual(application);
			expect(useApplicationStore.getState().areAppOperationsInProgress).toBe(false);
		});

		it("calls checkAndRestoreJobState after initialization", async () => {
			const mockCheckAndRestoreJobState = vi.fn();

			useApplicationStore.setState({
				checkAndRestoreJobState: mockCheckAndRestoreJobState,
			});

			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockCheckAndRestoreJobState).toHaveBeenCalled();
		});
	});

	describe("Cleanup on Unmount", () => {
		it("resets stores and clears job state on unmount", () => {
			const mockWizardReset = vi.fn();
			const mockApplicationReset = vi.fn();
			const mockClearRestoredJobState = vi.fn();

			useWizardStore.setState({ reset: mockWizardReset });
			useApplicationStore.setState({
				clearRestoredJobState: mockClearRestoredJobState,
				reset: mockApplicationReset,
			});

			const { unmount } = renderWizardClient();

			unmount();

			expect(mockWizardReset).toHaveBeenCalled();
			expect(mockApplicationReset).toHaveBeenCalled();
			expect(mockClearRestoredJobState).toHaveBeenCalled();
		});
	});

	describe("Step Component Props", () => {
		it("passes dialogRef to steps that require it", async () => {
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 10));

			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(screen.getByTestId("application-structure-step")).toHaveTextContent("Dialog ref: present");
		});

		it("passes dialogRef to Research Plan step", async () => {
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 10));

			useWizardStore.setState({ currentStep: WizardStep.RESEARCH_PLAN });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(screen.getByTestId("research-plan-step")).toHaveTextContent("Dialog ref: present");
		});
	});

	describe("Edge Cases", () => {
		it("handles invalid step gracefully", () => {
			useWizardStore.setState({ currentStep: "Invalid Step" as any });

			renderWizardClient();

			expect(screen.queryByTestId("application-details-step")).not.toBeInTheDocument();
			expect(screen.queryByTestId("application-structure-step")).not.toBeInTheDocument();
		});

		it("handles different organization and project IDs", () => {
			renderWizardClient({
				organizationId: "different-org",
				projectId: "different-project",
			});

			expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		});
	});
});
