import { setupAnalyticsMocks } from "::testing/analytics-test-utils";
import { ApplicationWithTemplateFactory } from "::testing/factories";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WizardStep } from "@/constants";
import { useWizardAnalytics } from "@/hooks/use-wizard-analytics";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import * as segment from "@/utils/segment";

vi.mock("@/utils/segment");
vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("useWizardAnalytics", () => {
	const { expectEventTracked, expectNoEventsTracked, resetAnalyticsMocks } = setupAnalyticsMocks();

	beforeEach(() => {
		resetAnalyticsMocks();
		vi.clearAllTimers();
		vi.useFakeTimers();

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
				currentStep: WizardStep.APPLICATION_DETAILS,
				organizationId: "org-123",
				projectId: "proj-123",
			});
		});

		it("should update context when stores change", () => {
			const { result } = renderHook(() => useWizardAnalytics());

			act(() => {
				useWizardStore.setState({ currentStep: WizardStep.KNOWLEDGE_BASE });
			});

			expect(result.current.context.currentStep).toBe(WizardStep.KNOWLEDGE_BASE);
		});
	});

	describe("trackEvent", () => {
		it("should track events with correct properties", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_1_NEXT, {
				applicationId: "app-123",
				currentStep: WizardStep.APPLICATION_DETAILS,
				organizationId: "org-123",
				projectId: "proj-123",
			});
		});

		it("should not track events without organizationId", async () => {
			expect.assertions(1);
			useOrganizationStore.setState({ selectedOrganizationId: null });
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expectNoEventsTracked();
		});

		it("should debounce duplicate events within 500ms", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expect(vi.mocked(segment.trackWizardEvent)).toHaveBeenCalledTimes(1);
		});

		it("should track events after debounce period", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			act(() => {
				vi.advanceTimersByTime(600);
			});

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expect(vi.mocked(segment.trackWizardEvent)).toHaveBeenCalledTimes(2);
		});

		it("should handle tracking errors gracefully", async () => {
			expect.assertions(1);
			vi.mocked(segment.trackWizardEvent).mockRejectedValueOnce(new Error("Network error"));
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expect(vi.mocked(segment.trackWizardEvent)).toHaveBeenCalled();
		});
	});

	describe("trackFileUpload", () => {
		it("should track file uploads for step 1", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackFileUpload("document.pdf", 1_024_000, "application/pdf", 1);
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_1_UPLOAD, {
				fileName: "document.pdf",
				fileSize: 1_024_000,
				fileType: "application/pdf",
			});
		});

		it("should track file uploads for step 3", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackFileUpload("research.docx", 2_048_000, "application/docx", 3);
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_3_UPLOAD, {
				fileName: "research.docx",
				fileSize: 2_048_000,
				fileType: "application/docx",
			});
		});
	});

	describe("trackLinkAdd", () => {
		it("should track URL additions with domain extraction", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackLinkAdd("https://example.com/page", 1);
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_1_LINK, {
				domain: "example.com",
				url: "https://example.com/page",
			});
		});

		it("should handle invalid URLs gracefully", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackLinkAdd("not-a-url", 1);
			});

			expectNoEventsTracked();
		});
	});

	describe("trackNavigation", () => {
		it("should track next navigation for applicable steps", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next");
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_1_NEXT);
		});

		it("should track navigation errors with validation details", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next", true, ["Title is required", "Missing files"]);
			});

			expectEventTracked(WizardAnalyticsEvent.ERROR_CONTINUE, {
				errorType: "validation",
				validationErrors: ["Title is required", "Missing files"],
			});
		});

		it("should track back navigation errors", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("back", true, ["Unsaved changes"]);
			});

			expectEventTracked(WizardAnalyticsEvent.ERROR_BACK, {
				errorType: "validation",
				validationErrors: ["Unsaved changes"],
			});
		});

		it("should not track navigation for steps without events", async () => {
			expect.assertions(1);
			useWizardStore.setState({ currentStep: WizardStep.APPLICATION_STRUCTURE });
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackNavigation("next");
			});

			expectNoEventsTracked();
		});
	});

	describe("trackAIInteraction", () => {
		it("should track AI interactions for step 3", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackAIInteraction("autofill", 3, "research_objectives");
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_3_AI, {
				aiType: "autofill",
				fieldName: "research_objectives",
			});
		});

		it("should track AI interactions for step 5", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackAIInteraction("generation", 5);
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_5_AI, {
				aiType: "generation",
				fieldName: undefined,
			});
		});
	});

	describe("trackContentAdd", () => {
		it("should track content additions", async () => {
			expect.assertions(1);
			const { result } = renderHook(() => useWizardAnalytics());

			await act(async () => {
				await result.current.trackContentAdd("objective", "Objective 1");
			});

			expectEventTracked(WizardAnalyticsEvent.STEP_4_ADD, {
				contentType: "objective",
				fieldName: "Objective 1",
			});
		});
	});

	describe("cleanup", () => {
		it("should not track events after unmount", async () => {
			expect.assertions(1);
			const { result, unmount } = renderHook(() => useWizardAnalytics());

			unmount();

			await act(async () => {
				await result.current.trackEvent(WizardAnalyticsEvent.STEP_1_NEXT);
			});

			expectNoEventsTracked();
		});
	});
});
