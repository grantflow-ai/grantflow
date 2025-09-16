import { expect, type Mock, vi } from "vitest";
import type { TrackableWizardEvent, WizardEventProperties } from "@/utils/analytics-events";
import * as segment from "@/utils/segment";

export interface AnalyticsTestHelpers {
	expectEventTracked: <T extends TrackableWizardEvent>(
		event: T,
		expectedProperties?: Partial<WizardEventProperties[T]>,
	) => void;
	expectNoEventsTracked: () => void;
	getTrackedEvents: () => { event: string; properties: any }[];
	mockTrackWizardEvent: Mock;
	resetAnalyticsMocks: () => void;
}

export function createMockWizardAnalyticsHook() {
	return {
		context: {
			applicationId: "test-app-id",
			currentStep: "Application Details" as const,
			organizationId: "test-org-id",
			projectId: "test-project-id",
		},
		trackAIInteraction: vi.fn().mockResolvedValue(undefined),
		trackContentAdd: vi.fn().mockResolvedValue(undefined),
		trackEvent: vi.fn().mockResolvedValue(undefined),
		trackFileUpload: vi.fn().mockResolvedValue(undefined),
		trackLinkAdd: vi.fn().mockResolvedValue(undefined),
		trackNavigation: vi.fn().mockResolvedValue(undefined),
	};
}

export function setupAnalyticsMocks(): AnalyticsTestHelpers {
	const mockTrackWizardEvent = vi.mocked(segment.trackWizardEvent);

	const getTrackedEvents = () => {
		return mockTrackWizardEvent.mock.calls.map(([event, properties]) => ({
			event,
			properties,
		}));
	};

	const expectEventTracked = <T extends TrackableWizardEvent>(
		event: T,
		expectedProperties?: Partial<WizardEventProperties[T]>,
	) => {
		const { calls } = mockTrackWizardEvent.mock;
		const eventCall = calls.find(([calledEvent]) => calledEvent === event);

		expect(eventCall).toBeDefined();

		if (expectedProperties && eventCall) {
			const [, actualProperties] = eventCall;
			for (const [key, value] of Object.entries(expectedProperties)) {
				expect(actualProperties).toHaveProperty(key, value);
			}
		}
	};

	const expectNoEventsTracked = () => {
		expect(mockTrackWizardEvent).not.toHaveBeenCalled();
	};

	const resetAnalyticsMocks = () => {
		mockTrackWizardEvent.mockClear();
	};

	return {
		expectEventTracked,
		expectNoEventsTracked,
		getTrackedEvents,
		mockTrackWizardEvent,
		resetAnalyticsMocks,
	};
}
