"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { RagNotificationHandler } from "@/components/shared/rag-notification-handler";
import { WizardStep } from "@/constants";
import { SourceIndexingStatus } from "@/enums";
import {
	type AutofillProgressMessage,
	isAutofillProgressMessage,
	isRagProcessingStatusMessage,
	isSourceProcessingNotificationMessage,
	type SourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { isTemplateEvent, type NotificationEvent, type TemplateGenerationEvent } from "@/types/notification-events";
import { log } from "@/utils/logger/client";
import { ApplicationDetailsStep } from "./application-details/application-details-step";
import { ApplicationStructureStep } from "./application-structure/application-structure-step";
import { GenerateCompleteStep } from "./generate-and-complete/generate-complete-step";
import { KnowledgeBaseStep } from "./knowledge-base/knowledge-base-step";
import { WizardDialog, type WizardDialogRef } from "./modal/wizard-dialog";
import { ResearchDeepDiveStep } from "./research-deep-dive/research-deep-dive-step";
import { ResearchPlanStep } from "./research-plan/research-plan-step";
import { WizardFooter, WizardHeader } from "./wizard-wrapper-components";

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
	const getApplication = useApplicationStore((state) => state.getApplication);
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

	const handleAutofillProgress = useCallback(
		(notification: AutofillProgressMessage) => {
			const { event } = notification;
			const { autofill_type, data, message } = notification.data;

			switch (event) {
				case "autofill_completed": {
					toast.success("Autofill completed successfully!");
					useWizardStore.getState().setAutofillLoading(autofill_type, false);
					void getApplication(organizationId, projectId, initialApplicationId);

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
		},
		[organizationId, projectId, initialApplicationId, getApplication],
	);

	useEffect(() => {
		if (notifications.length === 0) {
			return;
		}

		const latestNotification = notifications.at(-1);

		if (isSourceProcessingNotificationMessage(latestNotification)) {
			handleSourceProcessingNotification(latestNotification);
		} else if (isAutofillProgressMessage(latestNotification)) {
			handleAutofillProgress(latestNotification);
		}
		void getApplication(organizationId, projectId, initialApplicationId);
	}, [
		notifications,
		handleSourceProcessingNotification,
		handleAutofillProgress,
		getApplication,
		organizationId,
		projectId,
		initialApplicationId,
	]);

	const latestRagNotification = notifications.findLast((n) => isRagProcessingStatusMessage(n));

	useEffect(() => {
		if (!latestRagNotification) return;

		const { event } = latestRagNotification;
		const progressMap: Record<string, number> = {
			grant_application_generation_completed: 100,
			objectives_enriched: 16,
			relationships_extracted: 32,
			research_plan_completed: 48,
			section_texts_generated: 64,
			wikidata_enhancement_complete: 80,
		};

		if (event in progressMap) {
			setGenerationProgress(progressMap[event]);
		}
	}, [latestRagNotification]);

	useEffect(() => {
		if (latestRagNotification) {
			const { event } = latestRagNotification;

			log.info(
				"[useApplicationNotifications] Setting TemplateGenerationStatus with latestRagNotification event:",
				{ event },
			);
			if (isTemplateEvent(event as NotificationEvent)) {
				useWizardStore.getState().setTemplateGenerationEvent(event as TemplateGenerationEvent);
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

		if (event === "cfp_data_extracted" || event === "sections_extracted") {
			setGeneratingTemplate(true);
		}

		if (event === "grant_template_created") {
			setGeneratingTemplate(false);
			void getApplication(organizationId, projectId, initialApplicationId);
		}

		if (event === "pipeline_error") {
			setGeneratingTemplate(false);
			useWizardStore.getState().setTemplateGenerationFailed(true);
		}
	}, [latestRagNotification, setGeneratingTemplate, getApplication, organizationId, projectId, initialApplicationId]);

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
