import { useCallback, useEffect, useMemo, useRef } from "react";
import type { WizardStep } from "@/constants";
import { useApplicationStore } from "@/stores/application-store";
import { useOrganizationStore } from "@/stores/organization-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { TrackableWizardEvent, WizardAnalyticsContext, WizardEventProperties } from "@/utils/analytics-events";
import { WizardAnalyticsEvent } from "@/utils/analytics-events";
import { log } from "@/utils/logger/client";
import { trackWizardEvent } from "@/utils/segment";

interface UseWizardAnalyticsReturn {
	context: WizardAnalyticsContext;
	trackAIInteraction: (
		aiType: "autofill" | "generation" | "preview",
		step: 3 | 5,
		fieldName?: string,
	) => Promise<void>;
	trackContentAdd: (contentType: string, fieldName: string) => Promise<void>;
	trackEvent: <T extends TrackableWizardEvent>(
		event: T,
		additionalProperties?: Partial<Omit<WizardEventProperties[T], "timestamp" | keyof WizardAnalyticsContext>>,
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

	const context = useMemo<WizardAnalyticsContext>(
		() => ({
			applicationId: application?.id,
			currentStep,
			organizationId: selectedOrganizationId ?? "",
			projectId: application?.project_id,
		}),
		[application?.id, application?.project_id, selectedOrganizationId, currentStep],
	);

	const trackEvent = useCallback(
		async <T extends TrackableWizardEvent>(
			event: T,
			additionalProperties?: Partial<Omit<WizardEventProperties[T], "timestamp" | keyof WizardAnalyticsContext>>,
		) => {
			if (!mountedRef.current) {
				log.warn("Skipping analytics track - component unmounted", { event });
				return;
			}

			if (!context.organizationId) {
				log.warn("Skipping analytics - missing organizationId", { event });
				return;
			}

			const now = Date.now();
			if (lastEventRef.current) {
				const { event: lastEvent, timestamp } = lastEventRef.current;
				if (lastEvent === event && now - timestamp < DEBOUNCE_MS) {
					log.info("Skipping duplicate event", { event, timeDiff: now - timestamp });
					return;
				}
			}

			lastEventRef.current = { event, timestamp: now };

			const properties = {
				...context,
				...additionalProperties,
			} as Omit<WizardEventProperties[T], "timestamp">;

			try {
				await trackWizardEvent(event, properties);
			} catch (error) {
				log.error("Analytics tracking failed", { error, event, properties });
			}
		},
		[context],
	);

	const trackFileUpload = useCallback(
		async (fileName: string, fileSize: number, fileType: string, step: 1 | 3) => {
			await (step === 1
				? trackEvent(WizardAnalyticsEvent.STEP_1_UPLOAD, {
						fileName,
						fileSize,
						fileType,
					})
				: trackEvent(WizardAnalyticsEvent.STEP_3_UPLOAD, {
						fileName,
						fileSize,
						fileType,
					}));
		},
		[trackEvent],
	);

	const trackLinkAdd = useCallback(
		async (url: string, step: 1 | 3) => {
			try {
				const domain = new URL(url).hostname;
				await (step === 1
					? trackEvent(WizardAnalyticsEvent.STEP_1_LINK, {
							domain,
							url,
						})
					: trackEvent(WizardAnalyticsEvent.STEP_3_LINK, {
							domain,
							url,
						}));
			} catch (error) {
				log.error("Failed to parse URL for tracking", { error, url });
			}
		},
		[trackEvent],
	);

	const trackNavigation = useCallback(
		async (direction: "back" | "next", hasErrors = false, errorDetails?: string[]) => {
			if (hasErrors) {
				await (direction === "next"
					? trackEvent(WizardAnalyticsEvent.ERROR_CONTINUE, {
							errorType: "validation",
							validationErrors: errorDetails,
						})
					: trackEvent(WizardAnalyticsEvent.ERROR_BACK, {
							errorType: "validation",
							validationErrors: errorDetails,
						}));
				return;
			}

			const stepMap: Record<WizardStep, null | WizardAnalyticsEvent> = {
				"Application Details": WizardAnalyticsEvent.STEP_1_NEXT,
				"Application Structure": null,
				"Generate and Complete": null,
				"Knowledge Base": WizardAnalyticsEvent.STEP_3_NEXT,
				"Research Deep Dive": null,
				"Research Plan": WizardAnalyticsEvent.STEP_4_NEXT,
			};

			const nextEvent = stepMap[currentStep];
			if (nextEvent && direction === "next") {
				await trackEvent(nextEvent);
			}
		},
		[currentStep, trackEvent],
	);

	const trackAIInteraction = useCallback(
		async (aiType: "autofill" | "generation" | "preview", step: 3 | 5, fieldName?: string) => {
			await (step === 3
				? trackEvent(WizardAnalyticsEvent.STEP_3_AI, {
						aiType,
						fieldName,
					})
				: trackEvent(WizardAnalyticsEvent.STEP_5_AI, {
						aiType,
						fieldName,
					}));
		},
		[trackEvent],
	);

	const trackContentAdd = useCallback(
		async (contentType: string, fieldName: string) => {
			await trackEvent(WizardAnalyticsEvent.STEP_4_ADD, {
				contentType,
				fieldName,
			});
		},
		[trackEvent],
	);

	return {
		context,
		trackAIInteraction,
		trackContentAdd,
		trackEvent,
		trackFileUpload,
		trackLinkAdd,
		trackNavigation,
	};
}
