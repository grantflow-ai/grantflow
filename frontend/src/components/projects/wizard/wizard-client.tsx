"use client";

import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { NotificationHandler } from "@/components/projects/shared/notification-handler";
import {
	ApplicationDetailsStep,
	ApplicationStructureStep,
	GenerateCompleteStep,
	KnowledgeBaseStep,
	ResearchDeepDiveStep,
	ResearchPlanStep,
} from "@/components/projects/wizard";
import { WizardFooter, WizardHeader } from "@/components/wizard/wizard-wrapper-components";
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

interface WizardClientComponentProps {
	application: API.RetrieveApplication.Http200.ResponseBody;
	projectId: string;
}

export function WizardClientComponent({ application: initialApplication, projectId }: WizardClientComponentProps) {
	const currentStep = useWizardStore((state) => state.currentStep);
	const setGeneratingTemplate = useWizardStore((state) => state.setGeneratingTemplate);
	const ragJobState = useApplicationStore((state) => state.ragJobState);
	const retrieveApplication = useApplicationStore((state) => state.retrieveApplication);

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: initialApplication.id,
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
		"Application Structure": <ApplicationStructureStep key="Application Structure" />,
		"Generate and Complete": <GenerateCompleteStep key="Generate and Complete" />,
		"Knowledge Base": <KnowledgeBaseStep key="Knowledge Base" />,
		"Research Deep Dive": <ResearchDeepDiveStep key="Research Deep Dive" />,
		"Research Plan": <ResearchPlanStep key="Research Plan" />,
	};

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

			// Handle autofill events
			switch (event) {
				case "autofill_completed": {
					toast.success("Autofill completed successfully!");
					// Update loading state
					useWizardStore.getState().setAutofillLoading(autofill_type, false);
					// Refresh application data to get autofilled content
					void retrieveApplication(projectId, initialApplication.id);

					break;
				}
				case "autofill_error": {
					toast.error(`Autofill failed: ${message}`);
					useWizardStore.getState().setAutofillLoading(autofill_type, false);

					break;
				}
				case "autofill_progress": {
					// Progress updates can be shown in the UI if needed
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
				// No default
			}
		},
		[projectId, initialApplication.id, retrieveApplication],
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
		void retrieveApplication(projectId, initialApplication.id);
	}, [notifications, handleSourceProcessingNotification, handleAutofillProgress, retrieveApplication]);

	const latestRagNotification = notifications.findLast((n) => isRagProcessingStatusMessage(n));

	useEffect(() => {
		if (latestRagNotification && ragJobState.restoredJob) {
			useApplicationStore.getState().clearRestoredJobState();
		}
	}, [latestRagNotification, ragJobState.restoredJob]);

	useEffect(() => {
		if (!latestRagNotification) return;

		const { event } = latestRagNotification.data;

		if (event === "grant_template_generation_started") {
			setGeneratingTemplate(true);
		}

		if (event === "grant_template_generation_completed") {
			setGeneratingTemplate(false);
			void retrieveApplication(projectId, initialApplication.id);
		}

		if (event === "generation_error" || event === "pipeline_error") {
			setGeneratingTemplate(false);
		}
	}, [latestRagNotification, setGeneratingTemplate, retrieveApplication, projectId, initialApplication.id]);

	return (
		<div className="bg-light flex size-full flex-col grow" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{stepComponents[currentStep]}
			</section>
			<WizardFooter />

			{latestRagNotification && <NotificationHandler notification={latestRagNotification} />}
		</div>
	);
}
