import { ApplicationWithTemplateFactory } from "::testing/factories";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import * as tracking from "@/utils/tracking";
import { TrackingEvents } from "@/utils/tracking";

vi.mock("@/utils/tracking");
vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("useWizardAnalytics", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();

		useOrganizationStore.setState({
			selectedOrganizationId: "org-123",
		});
		useApplicationStore.setState({
			application: ApplicationWithTemplateFactory.build({
				id: "app-123",
				project_id: "proj-123",
			}),
		});
		useWizardStore.setState({
			currentStep: WizardStep.APPLICATION_DETAILS,
		});
	});

	describe("context", () => {
		it("should provide correct analytics context", () => {
			const { result } = renderHook(() => useWizardAnalytics());

			expect(result.current.context).toEqual({
				applicationId: "app-123",
				organizationId: "org-123",
				projectId: "proj-123",
			});
		});
	});

	describe("trackEvent", () => {
		it("should delegate to the tracking system", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(TrackingEvents.WIZARD_STEP_1_NEXT, {});
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(TrackingEvents.WIZARD_STEP_1_NEXT, {});
		});

		it("should handle tracking errors gracefully", async () => {
			vi.mocked(tracking.trackEvent).mockRejectedValueOnce(new Error("Network error"));
			const { result } = renderHook(() => useWizardAnalytics());

			await expect(result.current.trackEvent(TrackingEvents.WIZARD_STEP_1_NEXT, {})).resolves.not.toThrow();

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalled();
		});
	});

	describe("trackFileUpload", () => {
		it("should track file uploads for step 1", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackFileUpload("document.pdf", 1_024_000, "application/pdf", 1);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_1_UPLOAD,
				expect.objectContaining({
					fileName: "document.pdf",
					fileSize: 1_024_000,
					fileType: "application/pdf",
				}),
			);
		});

		it("should track file uploads for step 3", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackFileUpload("research.docx", 2_048_000, "application/docx", 3);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_3_UPLOAD,
				expect.objectContaining({
					fileName: "research.docx",
					fileSize: 2_048_000,
					fileType: "application/docx",
				}),
			);
		});
	});

	describe("trackLinkAdd", () => {
		it("should track URL additions with domain extraction", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackLinkAdd("https://example.com/page", 1);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_1_LINK,
				expect.objectContaining({
					domain: "example.com",
					url: "https://example.com/page",
				}),
			);
		});

		it("should handle invalid URLs gracefully", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackLinkAdd("not-a-url", 1);
			});

			expect(vi.mocked(tracking.trackEvent)).not.toHaveBeenCalled();
		});
	});

	describe("trackNavigation", () => {
		it("should track next navigation for applicable steps", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next");
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_1_NEXT,
				expect.any(Object),
			);
		});

		it("should track navigation errors with validation details", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next", true, ["Title is required", "Missing files"]);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_ERROR_CONTINUE,
				expect.objectContaining({
					errorType: "validation",
					validationErrors: ["Title is required", "Missing files"],
				}),
			);
		});

		it("should track back navigation errors", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("back", true, ["Unsaved changes"]);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_ERROR_BACK,
				expect.objectContaining({
					errorType: "validation",
					validationErrors: ["Unsaved changes"],
				}),
			);
		});

		it("should not track navigation for steps without events", async () => {
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next");
			});

			expect(vi.mocked(tracking.trackEvent)).not.toHaveBeenCalled();
		});
	});

	describe("trackAIInteraction", () => {
		it("should track AI interactions for step 3", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackAIInteraction("autofill", 3, "research_objectives");
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_3_AI,
				expect.objectContaining({
					aiType: "autofill",
					fieldName: "research_objectives",
				}),
			);
		});

		it("should track AI interactions for step 5", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackAIInteraction("generation", 5);
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_5_AI,
				expect.objectContaining({
					aiType: "generation",
					fieldName: undefined,
				}),
			);
		});
	});

	describe("trackContentAdd", () => {
		it("should track content additions", async () => {
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackContentAdd("objective", "Objective 1");
			});

			expect(vi.mocked(tracking.trackEvent)).toHaveBeenCalledWith(
				TrackingEvents.WIZARD_STEP_4_ADD,
				expect.objectContaining({
					contentType: "objective",
					fieldName: "Objective 1",
				}),
			);
		});
	});

	describe("cleanup", () => {
		it("should provide stable interface", () => {
			const { result } = renderHook(() => useWizardAnalytics());

			// Verify hook provides expected interface
			expect(typeof result.current.trackEvent).toBe("function");
			expect(typeof result.current.trackFileUpload).toBe("function");
			expect(typeof result.current.trackLinkAdd).toBe("function");
			expect(typeof result.current.trackNavigation).toBe("function");
			expect(typeof result.current.trackAIInteraction).toBe("function");
			expect(typeof result.current.trackContentAdd).toBe("function");
			expect(typeof result.current.context).toBe("object");
		});
	});
});
