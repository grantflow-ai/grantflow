"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RagNotificationHandler } from "@/components/shared/rag-notification-handler";
import { WizardStep } from "@/constants";
import { SourceIndexingStatus } from "@/enums";
import {
	type AutofillProgressMessage,
	hasApplicationData,
	isAutofillProgressMessage,
	isRagProcessingErrorMessage,
	isRagProcessingStatusMessage,
	isSourceProcessingNotificationMessage,
	type RagProcessingErrorMessage,
	type SourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import {
	type ApplicationGenerationEvent,
	isApplicationGenEvent,
	isRagPipelineErrorEvent,
	isTemplateEvent,
	type RagPipelineErrorEvent,
} from "@/types/notification-events";
import { log } from "@/utils/logger/client";
import { ApplicationDetailsStep } from "./application-details/application-details-step";
import { ApplicationStructureStep } from "./application-structure/application-structure-step";
import { GenerateCompleteStep } from "./generate-and-complete/generate-complete-step";
import { KnowledgeBaseStep } from "./knowledge-base/knowledge-base-step";
import { WizardDialog, type WizardDialogRef } from "./modal/wizard-dialog";
import { ResearchDeepDiveStep } from "./research-deep-dive/research-deep-dive-step";
import { ResearchPlanStep } from "./research-plan/research-plan-step";
import { WizardFooter, WizardHeader } from "./wizard-wrapper-components";

const RAG_PIPELINE_ERROR_MESSAGES: Record<RagPipelineErrorEvent, string> = {
	indexing_failed: "Document indexing failed. Please update or upload new documents and try again.",
	indexing_timeout: "Document indexing is taking longer than expected. Please wait and try again.",
	insufficient_context_error: "Not enough context to generate the template. Please add more sources or documents.",
	internal_error: "An internal error occurred. Please try again or contact support.",
	job_cancelled: "Template generation was cancelled.",
	llm_timeout: "AI processing timed out. Please try again.",
	pipeline_error: "An unexpected error occurred. Please try again or contact support.",
};

const APPLICATION_GENERATION_PROGRESS: Record<ApplicationGenerationEvent, number> = {
	grant_application_generation_completed: 100,
	objectives_enriched: 32,
	relationships_extracted: 16,
	research_plan_completed: 64,
	section_texts_generated: 80,
	wikidata_enhancement_complete: 48,
};

interface WizardClientComponentProps {
	applicationId: API.RetrieveApplication.Http200.ResponseBody["id"];
	organizationId: string;
	projectId: string;
}

export function WizardClientComponent({
	applicationId: initialApplicationId,
	organizationId,
	projectId,
}: WizardClientComponentProps) {
	const currentStep = useWizardStore((state) => state.currentStep);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);
	const ragJobState = useApplicationStore((state) => state.ragJobState);
	const setApplication = useApplicationStore((state) => state.setApplication);

	const dialogRef = useRef<null | WizardDialogRef>(null);
	const [generationProgress, setGenerationProgress] = useState(0);

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: initialApplicationId,
		organizationId,
		projectId,
	});

	const stepComponents: Record<string, React.ReactElement> = {
		"Application Details": (
			<ApplicationDetailsStep
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				key="Application Details"
			/>
		),
		"Application Structure": <ApplicationStructureStep dialogRef={dialogRef} key="Application Structure" />,
		"Generate and Complete": <GenerateCompleteStep key="Generate and Complete" progress={generationProgress} />,
		"Knowledge Base": <KnowledgeBaseStep key="Knowledge Base" />,
		"Research Deep Dive": <ResearchDeepDiveStep key="Research Deep Dive" />,
		"Research Plan": <ResearchPlanStep dialogRef={dialogRef} key="Research Plan" />,
	};

	useEffect(() => {
		log.info("[useApplicationNotifications] connectionStatus changed", {
			connectionStatus,
			organizationId,
			projectId,
		});
	}, [connectionStatus, organizationId, projectId]);

	useEffect(() => {
		log.info("[useApplicationNotifications] notifications changed", {
			notifications,
			organizationId,
			projectId,
		});
	}, [notifications, organizationId, projectId]);

	const handleSourceProcessingNotification = useCallback((notification: SourceProcessingNotificationMessage) => {
		const { identifier, indexing_status } = notification.data;

		if (indexing_status === SourceIndexingStatus.FAILED) {
			toast.error(`Failed to process ${identifier}`);
		} else if (indexing_status === SourceIndexingStatus.FINISHED) {
			toast.success(`Successfully processed ${identifier}`);
		} else {
			toast.info(`Processing ${identifier}...`);
		}
	}, []);

	const handleAutofillProgress = useCallback((notification: AutofillProgressMessage) => {
		const { event } = notification;
		const { autofill_type, data, message } = notification.data;

		switch (event) {
			case "autofill_completed": {
				toast.success("Autofill completed successfully!");
				useWizardStore.getState().setAutofillLoading(autofill_type, false);

				break;
			}
			case "autofill_error": {
				toast.error(`Autofill failed: ${message}`);
				useWizardStore.getState().setAutofillLoading(autofill_type, false);

				break;
			}
			case "autofill_progress": {
				if (data?.field_name && typeof data.field_name === "string") {
					toast.info(`Generating content for ${data.field_name}...`);
				}

				break;
			}
			case "autofill_started": {
				toast.info(
					`Starting autofill for ${autofill_type === "research_plan" ? "Research Plan" : "Research Deep Dive"}`,
				);

				break;
			}
		}
	}, []);

	const handleRagProcessingError = useCallback(
		(notification: RagProcessingErrorMessage) => {
			const { event } = notification;
			const { error_type, recoverable } = notification.data;

			log.error("RAG processing error received", {
				error_type,
				event,
				recoverable,
			});

			const message = isRagPipelineErrorEvent(event)
				? RAG_PIPELINE_ERROR_MESSAGES[event]
				: "Template generation failed. Please try again.";

			setGeneratingTemplate(false);
			useWizardStore.getState().setTemplateGenerationFailed(true, message);
			toast.error(message);
		},
		[setGeneratingTemplate],
	);

	useEffect(() => {
		if (notifications.length === 0) {
			return;
		}

		const latestNotification = notifications.at(-1);
		if (!latestNotification) {
			return;
		}

		if (hasApplicationData(latestNotification)) {
			setApplication(latestNotification.application_data);
			log.info("[WebSocket] Updated application state from notification", {
				event: latestNotification.event,
				hasTemplate: !!latestNotification.application_data.grant_template,
				templateRagSources: latestNotification.application_data.grant_template?.rag_sources.length ?? 0,
			});
		}

		if (isSourceProcessingNotificationMessage(latestNotification)) {
			handleSourceProcessingNotification(latestNotification);
		} else if (isAutofillProgressMessage(latestNotification)) {
			handleAutofillProgress(latestNotification);
		} else if (isRagProcessingErrorMessage(latestNotification)) {
			handleRagProcessingError(latestNotification);
		}
	}, [
		notifications,
		setApplication,
		handleSourceProcessingNotification,
		handleAutofillProgress,
		handleRagProcessingError,
	]);

	const latestRagNotification = notifications.findLast((n) => isRagProcessingStatusMessage(n));

	useEffect(() => {
		if (!latestRagNotification) return;

		const { event } = latestRagNotification;

		if (isApplicationGenEvent(event)) {
			setGenerationProgress(APPLICATION_GENERATION_PROGRESS[event]);
		}
	}, [latestRagNotification]);

	useEffect(() => {
		if (latestRagNotification) {
			const { event } = latestRagNotification;

			log.info(
				"[useApplicationNotifications] Setting TemplateGenerationStatus with latestRagNotification event:",
				{ event },
			);
			if (isTemplateEvent(event)) {
				useWizardStore.getState().setTemplateEvent(event);
			}
		}
	}, [latestRagNotification]);

	useEffect(() => {
		if (latestRagNotification && ragJobState.restoredJob) {
			useApplicationStore.getState().clearRestoredJobState();
		}
	}, [latestRagNotification, ragJobState.restoredJob]);

	useEffect(() => {
		if (!latestRagNotification) return;

		const { event } = latestRagNotification;

		if (isTemplateEvent(event) && event !== "grant_template_created") {
			setGeneratingTemplate(true);
		}

		if (event === "grant_template_created") {
			setGeneratingTemplate(false);
		}

		if (event === "grant_application_generation_completed") {
			useWizardStore.getState().setGeneratingApplication(false);
			useWizardStore.getState().resetApplicationGenerationComplete();
		}
	}, [latestRagNotification, setGeneratingTemplate]);

	useEffect(() => {
		if (isGeneratingTemplate && currentStep === WizardStep.APPLICATION_DETAILS) {
			useWizardStore.getState().toNextStep();
		}
	}, [isGeneratingTemplate, currentStep]);

	return (
		<div className="bg-light flex h-screen w-full flex-col overflow-hidden" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-hidden" data-testid="step-content-container">
				{stepComponents[currentStep]}
			</section>
			<WizardFooter />

			{latestRagNotification && <RagNotificationHandler notification={latestRagNotification} />}
			<WizardDialog ref={dialogRef} />
		</div>
	);
}
