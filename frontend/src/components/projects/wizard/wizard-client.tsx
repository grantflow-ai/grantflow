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
		useApplicationStore.setState({
			application: initialApplication,
			areAppOperationsInProgress: false,
		});

		useWizardStore.getState().reset();

		void useApplicationStore.getState().checkAndRestoreJobState();

		return () => {
			useWizardStore.getState().reset();
			useApplicationStore.getState().clearRestoredJobState();
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

	useEffect(() => {
		if (notifications.length === 0) {
			return;
		}

		const latestNotification = notifications.at(-1);

		if (isSourceProcessingNotificationMessage(latestNotification)) {
			handleSourceProcessingNotification(latestNotification);
		}
	}, [notifications, handleSourceProcessingNotification]);

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
		<div className="bg-light flex h-screen w-screen flex-col" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{stepComponents[currentStep]}
			</section>
			<WizardFooter />

			{latestRagNotification && <NotificationHandler notification={latestRagNotification} />}
		</div>
	);
}