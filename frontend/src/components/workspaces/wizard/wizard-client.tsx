"use client";

import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { NotificationHandler } from "@/components/workspaces/notification-handler";
import {
	ApplicationDetailsStep,
	ApplicationStructureStep,
	GenerateCompleteStep,
	KnowledgeBaseStep,
	ResearchDeepDiveStep,
	ResearchPlanStep,
} from "@/components/workspaces/wizard";
import { WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";
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
	workspaceId: string;
}

export function WizardClientComponent({ application: initialApplication, workspaceId }: WizardClientComponentProps) {
	const { currentStep } = useWizardStore();
	const { ragJobState } = useApplicationStore();

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: initialApplication.id,
		workspaceId,
	});

	const stepComponents: Record<string, React.ReactElement> = useMemo(
		() => ({
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
		}),
		[connectionStatus, connectionStatusColor],
	);

	useEffect(() => {
		useApplicationStore.getState().reset();
		useApplicationStore.setState({
			application: initialApplication,
			isLoading: false,
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

	const restoredJobNotification = ragJobState.restoredJob
		? {
				data: {
					current_pipeline_stage: ragJobState.restoredJob.current_stage,
					event: "restored_progress",
					message: `Resuming ${ragJobState.restoredJob.job_type === "grant_template_generation" ? "template generation" : "application generation"}...`,
					total_pipeline_stages: ragJobState.restoredJob.total_stages,
				},
				event: "restored_progress",
				parent_id: initialApplication.id,
				type: "data" as const,
			}
		: null;

	const notificationToShow = latestRagNotification ?? restoredJobNotification;

	useEffect(() => {
		if (latestRagNotification && ragJobState.restoredJob) {
			useApplicationStore.getState().clearRestoredJobState();
		}
	}, [latestRagNotification, ragJobState.restoredJob]);

	return (
		<div className="bg-light flex h-screen w-screen flex-col" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{stepComponents[currentStep]}
			</section>
			<WizardFooter />
			{notificationToShow && <NotificationHandler notification={notificationToShow} />}
		</div>
	);
}