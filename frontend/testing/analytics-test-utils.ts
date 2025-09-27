import { expect, type Mock, vi } from "vitest";
import type { EventProperties, TrackableEvent } from "@/utils/tracking";
import * as tracking from "@/utils/tracking";

export interface AnalyticsTestHelpers {
	expectEventTracked: <T extends TrackableEvent>(event: T, expectedProperties?: Partial<EventProperties[T]>) => void;
	expectNoEventsTracked: () => void;
	getTrackedEvents: () => { event: string; properties: any }[];
	mockTrackEvent: Mock;
	resetAnalyticsMocks: () => void;
}

export function createMockWizardAnalyticsHook() {
	return {
		context: {
			applicationId: "test-app-id",
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
	// Ensure the tracking module is mocked properly
	const mockTrackEvent = vi.mocked(tracking.trackEvent);

	const getTrackedEvents = () => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		return (mockTrackEvent.mock?.calls || []).map(([event, properties]) => ({
			event,
			properties,
		}));
	};

	const expectEventTracked = <T extends TrackableEvent>(
		event: T,
		expectedProperties?: Partial<EventProperties[T]>,
	) => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		const calls = mockTrackEvent.mock?.calls || [];
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
		expect(mockTrackEvent).not.toHaveBeenCalled();
	};

	const resetAnalyticsMocks = () => {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (mockTrackEvent && typeof mockTrackEvent.mockClear === "function") {
			mockTrackEvent.mockClear();
		}
	};

	return {
		expectEventTracked,
		expectNoEventsTracked,
		getTrackedEvents,
		mockTrackEvent,
		resetAnalyticsMocks,
	};
}
