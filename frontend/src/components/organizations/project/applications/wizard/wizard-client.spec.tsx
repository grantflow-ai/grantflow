import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ApplicationWithTemplateFactory, GrantSectionBaseFactory, GrantTemplateFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { WizardClientComponent } from "./wizard-client";

vi.mock("./application-details/application-details-step", () => ({
	ApplicationDetailsStep: ({ connectionStatus, connectionStatusColor }: any) => (
		<div data-testid="application-details-step">
			Status: {connectionStatus} - Color: {connectionStatusColor}
		</div>
	),
}));

vi.mock("./application-structure/application-structure-step", () => ({
	ApplicationStructureStep: ({ dialogRef }: any) => (
		<div data-testid="application-structure-step">Dialog ref: {dialogRef ? "present" : "missing"}</div>
	),
}));

vi.mock("./generate-and-complete/generate-complete-step", () => ({
	GenerateCompleteStep: () => <div data-testid="generate-complete-step">Generate Complete</div>,
}));

vi.mock("./knowledge-base/knowledge-base-step", () => ({
	KnowledgeBaseStep: () => <div data-testid="knowledge-base-step">Knowledge Base</div>,
}));

vi.mock("./research-deep-dive/research-deep-dive-step", () => ({
	ResearchDeepDiveStep: () => <div data-testid="research-deep-dive-step">Research Deep Dive</div>,
}));

vi.mock("./research-plan/research-plan-step", () => ({
	ResearchPlanStep: ({ dialogRef }: any) => (
		<div data-testid="research-plan-step">Dialog ref: {dialogRef ? "present" : "missing"}</div>
	),
}));

vi.mock("./wizard-wrapper-components", () => ({
	WizardFooter: () => <div data-testid="wizard-footer">Footer</div>,
	WizardHeader: () => <div data-testid="wizard-header">Header</div>,
}));

const mockDialogOpen = vi.fn();
const mockDialogClose = vi.fn();

vi.mock("./modal/wizard-dialog", async () => {
	const { forwardRef } = await import("react");
	return {
		WizardDialog: forwardRef((_: any, ref: any) => {
			if (ref) {
				Object.assign(ref, {
					current: {
						close: mockDialogClose,
						open: mockDialogOpen,
					},
				});
			}
			return <div data-testid="wizard-dialog">Dialog</div>;
		}),
	};
});

vi.mock("@/components/shared/notification-handler", () => ({
	NotificationHandler: ({ notification }: any) => (
		<div data-testid="notification-handler">Notification: {notification?.data?.event}</div>
	),
}));

vi.mock("@/hooks/use-application-notifications", () => ({
	useApplicationNotifications: () => ({
		connectionStatus: "connected",
		connectionStatusColor: "green",
		notifications: [],
	}),
}));

const sharedApplication = ApplicationWithTemplateFactory.build();

function renderWizardClient(overrides = {}) {
	const defaultProps = {
		applicationId: sharedApplication.id,
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
		it("does not reset stores on component mount", () => {
			const mockApplicationReset = vi.fn();
			const mockWizardReset = vi.fn();

			useApplicationStore.setState({ reset: mockApplicationReset });
			useWizardStore.setState({ reset: mockWizardReset });

			renderWizardClient();

			expect(mockApplicationReset).not.toHaveBeenCalled();
			expect(mockWizardReset).not.toHaveBeenCalled();
		});

		it("uses applicationId prop instead of application object", () => {
			const testApplicationId = "test-app-id-123";

			renderWizardClient({ applicationId: testApplicationId });

			expect(screen.getByTestId("wizard-page")).toBeInTheDocument();
		});
	});

	describe("Cleanup on Unmount", () => {
		it("does not handle cleanup on unmount", () => {
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

			expect(mockWizardReset).not.toHaveBeenCalled();
			expect(mockApplicationReset).not.toHaveBeenCalled();
			expect(mockClearRestoredJobState).not.toHaveBeenCalled();
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

	describe("Application RAG Sources Failure Modal", () => {
		beforeEach(() => {
			mockDialogOpen.mockClear();
			mockDialogClose.mockClear();
		});

		it("shows modal when first failed source appears", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "corrupted.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(1);
			});
		});

		it("does not show modal when failed count stays the same", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "corrupted.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application });
			const { rerender } = renderWizardClient();

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(1);
			});

			// Update with same failed count
			useApplicationStore.setState({ application });
			rerender(
				<WizardClientComponent
					applicationId={application.id}
					organizationId="org-123"
					projectId="project-456"
				/>,
			);

			// Should still be called only once
			expect(mockDialogOpen).toHaveBeenCalledTimes(1);
		});

		it("shows modal again when failed count increases", async () => {
			const application1 = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "corrupted1.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application: application1 });
			renderWizardClient();

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(1);
			});

			// Add second failed source
			const application2 = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "corrupted1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "corrupted2.pdf", sourceId: "2", status: "FAILED" },
				],
			});

			useApplicationStore.setState({ application: application2 });

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(2);
			});
		});

		it("does not show modal when there are INDEXING sources", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "corrupted.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "processing.pdf", sourceId: "2", status: "INDEXING" },
				],
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockDialogOpen).not.toHaveBeenCalled();
		});

		it("does not show modal when there are CREATED sources", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "corrupted.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "new.pdf", sourceId: "2", status: "CREATED" },
				],
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockDialogOpen).not.toHaveBeenCalled();
		});

		it("does not show modal when there are no sources", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [],
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockDialogOpen).not.toHaveBeenCalled();
		});

		it("does not show modal when there are no failed sources", async () => {
			const application = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "success.pdf", sourceId: "1", status: "FINISHED" },
					{ filename: "success2.pdf", sourceId: "2", status: "FINISHED" },
				],
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockDialogOpen).not.toHaveBeenCalled();
		});

		it("shows modal when failed count decreases then increases", async () => {
			// Start with 2 failed
			const application1 = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "corrupted1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "corrupted2.pdf", sourceId: "2", status: "FAILED" },
				],
			});

			useApplicationStore.setState({ application: application1 });
			renderWizardClient();

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(1);
			});

			// Decrease to 1 failed (user deleted one)
			const application2 = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "corrupted1.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application: application2 });

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(2);
			});

			// Increase back to 2 failed
			const application3 = ApplicationWithTemplateFactory.build({
				rag_sources: [
					{ filename: "corrupted1.pdf", sourceId: "1", status: "FAILED" },
					{ filename: "corrupted3.pdf", sourceId: "3", status: "FAILED" },
				],
			});

			useApplicationStore.setState({ application: application3 });

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(3);
			});
		});

		it("shows modal only after INDEXING completes and failure detected", async () => {
			// Start with INDEXING
			const application1 = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "processing.pdf", sourceId: "1", status: "INDEXING" }],
			});

			useApplicationStore.setState({ application: application1 });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(mockDialogOpen).not.toHaveBeenCalled();

			// Update to FAILED
			const application2 = ApplicationWithTemplateFactory.build({
				rag_sources: [{ filename: "processing.pdf", sourceId: "1", status: "FAILED" }],
			});

			useApplicationStore.setState({ application: application2 });

			await waitFor(() => {
				expect(mockDialogOpen).toHaveBeenCalledTimes(1);
			});
		});
	});

	describe("RAG Sources Snapshot Capture", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("captures snapshot when grant sections are created", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const applicationWithoutSections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					id: "template-1",
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application: applicationWithoutSections });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(captureTempSourcesSnapshot).not.toHaveBeenCalled();

			const applicationWithSections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [GrantSectionBaseFactory.build({ id: "section-1", title: "Section 1" })],
					id: "template-1",
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application: applicationWithSections });

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledOnce();
			});
		});

		it("does not capture snapshot when sections are empty", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					id: "template-1",
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(captureTempSourcesSnapshot).not.toHaveBeenCalled();
		});

		it("captures snapshot when sections length changes from 1 to 2", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const applicationWith1Section = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [GrantSectionBaseFactory.build({ id: "section-1", title: "Section 1" })],
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application: applicationWith1Section });
			renderWizardClient();

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledTimes(1);
			});

			const applicationWith2Sections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionBaseFactory.build({ id: "section-1", order: 0, title: "Section 1" }),
						GrantSectionBaseFactory.build({ id: "section-2", order: 1, title: "Section 2" }),
					],
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application: applicationWith2Sections });

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledTimes(2);
			});
		});

		it("does not capture snapshot when sections length stays the same", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [GrantSectionBaseFactory.build({ id: "section-1", title: "Section 1" })],
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledOnce();
			});

			useApplicationStore.setState({ application });

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(captureTempSourcesSnapshot).toHaveBeenCalledOnce();
		});

		it("captures snapshot when sections are deleted (length changes)", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const applicationWith2Sections = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionBaseFactory.build({ id: "section-1", order: 0, title: "Section 1" }),
						GrantSectionBaseFactory.build({ id: "section-2", order: 1, title: "Section 2" }),
					],
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application: applicationWith2Sections });
			renderWizardClient();

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledOnce();
			});

			const applicationWith1Section = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [GrantSectionBaseFactory.build({ id: "section-1", title: "Section 1" })],
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application: applicationWith1Section });

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledTimes(2);
			});
		});

		it("does not capture snapshot when grant_sections is undefined", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: undefined,
					id: "template-1",
					rag_sources: [],
				}),
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(captureTempSourcesSnapshot).not.toHaveBeenCalled();
		});

		it("captures snapshot immediately on mount when sections exist", async () => {
			const captureTempSourcesSnapshot = vi.fn();
			useWizardStore.setState({ captureTempSourcesSnapshot });

			const application = ApplicationWithTemplateFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [
						GrantSectionBaseFactory.build({ id: "section-1", order: 0, title: "Section 1" }),
						GrantSectionBaseFactory.build({ id: "section-2", order: 1, title: "Section 2" }),
					],
					id: "template-1",
					rag_sources: [{ filename: "test.pdf", sourceId: "1", status: "FINISHED" }],
				}),
			});

			useApplicationStore.setState({ application });
			renderWizardClient();

			await waitFor(() => {
				expect(captureTempSourcesSnapshot).toHaveBeenCalledOnce();
			});
		});
	});
});
