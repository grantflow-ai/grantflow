"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

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
	type RagProcessingStatusMessage,
	type SourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

export default function CreateGrantApplicationWizardPage() {
	const params = useParams<{ workspaceId: string }>();
	const searchParams = useSearchParams();
	const router = useRouter();

	const {
		ui: { currentStep },
	} = useWizardStore();
	const { application, handleApplicationInit } = useApplicationStore();

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: application?.id,
		workspaceId: params.workspaceId,
	});

	// Get or create an application on mount ~keep
	useEffect(() => {
		const applicationId = searchParams.get("applicationId");
		const handleApplication = async () => {
			try {
				await handleApplicationInit(params.workspaceId, applicationId ?? undefined);
			} catch {
				router.push(`/workspaces/${params.workspaceId}`);
			}
		};
		void handleApplication();
	}, [params.workspaceId, router, searchParams, handleApplicationInit]);

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

	const handleRagProcessingNotification = useCallback((notification: RagProcessingStatusMessage) => {
		const { data, message } = notification.data;

		if (data && Object.keys(data).length > 0) {
			const description = Object.entries(data)
				.map(([key, value]) => `${key}: ${value}`)
				.join(", ");
			toast.info(message, { description });
		} else {
			toast.info(message);
		}
	}, []);

	useEffect(() => {
		if (notifications.length === 0) {
			return;
		}

		const latestNotification = notifications.at(-1);

		if (isSourceProcessingNotificationMessage(latestNotification)) {
			handleSourceProcessingNotification(latestNotification);
		} else if (isRagProcessingStatusMessage(latestNotification)) {
			handleRagProcessingNotification(latestNotification);
		}
	}, [notifications, handleSourceProcessingNotification, handleRagProcessingNotification]);

	const steps = [
		<ApplicationDetailsStep
			connectionStatus={connectionStatus}
			connectionStatusColor={connectionStatusColor}
			key={0}
		/>,
		<ApplicationStructureStep
			connectionStatus={connectionStatus}
			connectionStatusColor={connectionStatusColor}
			key={1}
		/>,
		<KnowledgeBaseStep key={2} />,
		<ResearchPlanStep key={3} />,
		<ResearchDeepDiveStep key={4} />,
		<GenerateCompleteStep key={5} />,
	];

	if (!application) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">
						{!!searchParams.get("applicationId") && "Loading application..."}
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-light flex h-screen w-screen flex-col" data-testid="wizard-page">
			<WizardHeader />
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{steps[currentStep]}
			</section>
			<WizardFooter />
		</div>
	);
}
