import { useCallback, useEffect, useMemo, useRef } from "react";
import type { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import { log } from "@/utils/logger/client";
import {
	type BaseEventProperties,
	type EventProperties,
	type TrackableEvent,
	TrackingEvents,
	trackEvent,
} from "@/utils/tracking";

interface UseWizardAnalyticsReturn {
	context: Omit<BaseEventProperties, "path" | "referrer" | "sessionId" | "timestamp">;
	trackAIInteraction: (
		aiType: "autofill" | "generation" | "preview",
		step: 3 | 5,
		fieldName?: string,
	) => Promise<void>;
	trackContentAdd: (contentType: string, fieldName: string) => Promise<void>;
	trackEvent: <T extends TrackableEvent>(
		event: T,
		properties: Omit<EventProperties[T], "path" | "sessionId" | "timestamp">,
	) => Promise<void>;
	trackFileUpload: (fileName: string, fileSize: number, fileType: string, step: 1 | 3) => Promise<void>;
	trackLinkAdd: (url: string, step: 1 | 3) => Promise<void>;
	trackNavigation: (direction: "back" | "next", hasErrors?: boolean, errorDetails?: string[]) => Promise<void>;
}

const DEBOUNCE_MS = 500;

export function useWizardAnalytics(): UseWizardAnalyticsReturn {
	const currentStep = useWizardStore((state) => state.currentStep);
	const application = useApplicationStore((state) => state.application);
	const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId);

	const lastEventRef = useRef<{ event: string; timestamp: number } | null>(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		return () => {
			mountedRef.current = false;
		};
	}, []);

	const context = useMemo(
		() => ({
			applicationId: application?.id,
			organizationId: selectedOrganizationId ?? "",
			projectId: application?.project_id,
		}),
		[application?.id, application?.project_id, selectedOrganizationId],
	);

	const trackDeduplicatedEvent = useCallback(
		async (eventName: string, eventKey: keyof typeof TrackingEvents, properties: Record<string, unknown>) => {
			if (!mountedRef.current) {
				log.warn("Skipping analytics track - component unmounted", { event: eventName });
				return;
			}

			if (!context.organizationId) {
				log.warn("Skipping analytics - missing organizationId", { event: eventName });
				return;
			}

			const now = Date.now();
			const lastEvent = lastEventRef.current;

			if (lastEvent && now - lastEvent.timestamp < DEBOUNCE_MS && lastEvent.event === eventName) {
				log.info("Skipping duplicate event", { event: eventName, timeDiff: now - lastEvent.timestamp });
				return;
			}

			lastEventRef.current = { event: eventName, timestamp: now };

			try {
				await trackEvent(TrackingEvents[eventKey], {
					...context,
					...properties,
				});
			} catch (error) {
				log.error("Analytics tracking failed", { error, event: eventName, properties });
			}
		},
		[context],
	);

	const trackFileUpload = useCallback(
		async (fileName: string, fileSize: number, fileType: string, step: 1 | 3) => {
			const eventKey = step === 1 ? "WIZARD_STEP_1_UPLOAD" : "WIZARD_STEP_3_UPLOAD";
			await trackDeduplicatedEvent(`wizard-step-${step}-upload`, eventKey, {
				fileName,
				fileSize,
				fileType,
			});
		},
		[trackDeduplicatedEvent],
	);

	const trackLinkAdd = useCallback(
		async (url: string, step: 1 | 3) => {
			try {
				const domain = new URL(url).hostname;
				const eventKey = step === 1 ? "WIZARD_STEP_1_LINK" : "WIZARD_STEP_3_LINK";
				await trackDeduplicatedEvent(`wizard-step-${step}-link`, eventKey, {
					domain,
					url,
				});
			} catch (error) {
				log.error("Failed to parse URL for tracking", { error, url });
			}
		},
		[trackDeduplicatedEvent],
	);

	const trackNavigation = useCallback(
		async (direction: "back" | "next", hasErrors = false, errorDetails?: string[]) => {
			if (hasErrors) {
				const eventKey = direction === "next" ? "WIZARD_ERROR_CONTINUE" : "WIZARD_ERROR_BACK";
				await trackDeduplicatedEvent(`wizard-error-${direction}`, eventKey, {
					errorType: "validation",
					validationErrors: errorDetails,
				});
				return;
			}

			const stepMap: Record<WizardStep, keyof typeof TrackingEvents | null> = {
				"Application Details": "WIZARD_STEP_1_NEXT",
				"Application Structure": null,
				"Application Type": null,
				"Generate and Complete": null,
				"Knowledge Base": "WIZARD_STEP_3_NEXT",
				"Research Deep Dive": null,
				"Research Plan": "WIZARD_STEP_4_NEXT",
			};

			const eventKey = stepMap[currentStep];
			if (eventKey && direction === "next") {
				await trackDeduplicatedEvent(TrackingEvents[eventKey], eventKey, {});
			}
		},
		[currentStep, trackDeduplicatedEvent],
	);

	const trackAIInteraction = useCallback(
		async (aiType: "autofill" | "generation" | "preview", step: 3 | 5, fieldName?: string) => {
			const eventKey = step === 3 ? "WIZARD_STEP_3_AI" : "WIZARD_STEP_5_AI";
			await trackDeduplicatedEvent(`wizard-step-${step}-ai`, eventKey, {
				aiType,
				fieldName,
			});
		},
		[trackDeduplicatedEvent],
	);

	const trackContentAdd = useCallback(
		async (contentType: string, fieldName: string) => {
			await trackDeduplicatedEvent("wizard-step-4-add", "WIZARD_STEP_4_ADD", {
				contentType,
				fieldName,
			});
		},
		[trackDeduplicatedEvent],
	);

	return {
		context,
		trackAIInteraction,
		trackContentAdd,
		trackEvent: async <T extends TrackableEvent>(
			event: T,
			properties: Omit<EventProperties[T], "path" | "sessionId" | "timestamp">,
		) => {
			try {
				await trackEvent(event, properties);
			} catch (error) {
				log.error("Analytics tracking failed", { error, event, properties });
			}
		},
		trackFileUpload,
		trackLinkAdd,
		trackNavigation,
	};
}
