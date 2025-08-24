"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { NotificationHandler } from "@/components/shared/notification-handler";
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
import { type TemplateGenerationEvent, useWizardStore } from "@/stores/wizard-store";
import type { API } from "@/types/api-types";
import { log } from "@/utils/logger/client";
import { ApplicationStructureStep } from "./application-structure/application-structure-step";
import { ApplicationDetailsStep } from "./steps/application-details-step";
import { GenerateCompleteStep } from "./steps/generate-complete-step";
import { KnowledgeBaseStep } from "./steps/knowledge-base-step";
import { ResearchDeepDiveStep } from "./steps/research-deep-dive-step";
import { ResearchPlanStep } from "./steps/research-plan-step";
import { WizardDialog, type WizardDialogRef } from "./wizard-dialog";
import { WizardFooter, WizardHeader } from "./wizard-wrapper-components";

interface WizardClientComponentProps {
	application: API.RetrieveApplication.Http200.ResponseBody;
	organizationId: string;
	projectId: string;
}

export function WizardClientComponent({
	application: initialApplication,
	organizationId,
	projectId,
}: WizardClientComponentProps) {
	const currentStep = useWizardStore((state) => state.currentStep);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);
	const ragJobState = useApplicationStore((state) => state.ragJobState);
	const getApplication = useApplicationStore((state) => state.getApplication);
	const dialogRef = useRef<null | WizardDialogRef>(null);

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: initialApplication.id,
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
		"Generate and Complete": <GenerateCompleteStep key="Generate and Complete" />,
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

	useEffect(() => {
		useApplicationStore.getState().reset();
		useWizardStore.getState().reset();

		useApplicationStore.setState({
			application: initialApplication,
			areAppOperationsInProgress: false,
		});

		const timeoutId = setTimeout(() => {
			void useApplicationStore.getState().checkAndRestoreJobState();
		}, 0);

		return () => {
			clearTimeout(timeoutId);
			useWizardStore.getState().reset();
			useApplicationStore.getState().clearRestoredJobState();
			useApplicationStore.getState().reset();
		};
	}, [initialApplication]);

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
					void getApplication(organizationId, projectId, initialApplication.id);

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
		[organizationId, projectId, initialApplication.id, getApplication],
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
		void getApplication(organizationId, projectId, initialApplication.id);
	}, [
		notifications,
		handleSourceProcessingNotification,
		handleAutofillProgress,
		getApplication,
		organizationId,
		projectId,
		initialApplication.id,
	]);

	const latestRagNotification = notifications.findLast((n) => isRagProcessingStatusMessage(n));

	useEffect(() => {
		if (latestRagNotification) {
			const { event, message } = latestRagNotification.data;

			log.info("[useApplicationNotifications] Received event from latestRagNotification:", { event });
			useWizardStore.getState().setTemplateGenerationStatus({
				event: event as TemplateGenerationEvent,
				message,
			});
		}
	}, [latestRagNotification]);

	useEffect(() => {
		if (latestRagNotification && ragJobState.restoredJob) {
			useApplicationStore.getState().clearRestoredJobState();
		}
	}, [latestRagNotification, ragJobState.restoredJob]);

	useEffect(() => {
		if (!latestRagNotification) return;

		const { event } = latestRagNotification.data;

		if (
			event === "grant_template_generation_started" ||
			event === "indexing_in_progress" ||
			event === "extracting_cfp_data" ||
			event === "grant_template_extraction" ||
			event === "grant_template_metadata"
		) {
			setGeneratingTemplate(true);
		}

		if (event === "grant_template_generation_completed") {
			setGeneratingTemplate(false);
			void getApplication(organizationId, projectId, initialApplication.id);
		}

		if (event === "generation_error" || event === "pipeline_error") {
			setGeneratingTemplate(false);
		}
	}, [
		latestRagNotification,
		setGeneratingTemplate,
		getApplication,
		organizationId,
		projectId,
		initialApplication.id,
	]);

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

			{latestRagNotification && <NotificationHandler notification={latestRagNotification} />}
			<WizardDialog ref={dialogRef} />
		</div>
	);
}
