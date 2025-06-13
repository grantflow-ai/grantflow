"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect } from "react";
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
import { WIZARD_STEP_TITLES } from "@/constants";
import { SourceIndexingStatus } from "@/enums";
import {
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { DEFAULT_APPLICATION_TITLE, useWizardStore } from "@/stores/wizard-store";

const INITIAL_STEP = 0;

export default function CreateGrantApplicationWizardPage() {
	const params = useParams<{ workspaceId: string }>();
	const router = useRouter();

	const {
		applicationId,
		applicationTitle,
		currentStep,
		goToNextStep,
		goToPreviousStep,
		initializeApplication,
		isCreatingApplication,
		isCurrentStepValid,
		resetWizard,
	} = useWizardStore();

	const showHeaderInfo = currentStep > INITIAL_STEP;

	// Use the notifications hook once we have an applicationId
	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId,
		workspaceId: params.workspaceId,
	});

	useEffect(() => {
		const init = async () => {
			try {
				await initializeApplication(params.workspaceId);
			} catch {
				toast.error("Failed to initialize application. Please try again.");
				router.push(`/workspaces/${params.workspaceId}`);
			}
		};

		void init();
	}, [params.workspaceId, router, initializeApplication, resetWizard]);

	// Handle incoming notifications
	useEffect(() => {
		if (notifications.length === 0) {
			return;
		}

		const latestNotification = notifications.at(-1);

		if (isSourceProcessingNotificationMessage(latestNotification)) {
			if (latestNotification.data.indexing_status === SourceIndexingStatus.FAILED) {
				toast.error(`Failed to process ${latestNotification.data.identifier}`);
				return;
			} else if (latestNotification.data.indexing_status === SourceIndexingStatus.FINISHED) {
				toast.success(`Successfully processed ${latestNotification.data.identifier}`);
				return;
			}
			toast.info(`Processing ${latestNotification.data.identifier}...`);
		}
	}, [notifications]);

	const handleNext = () => {
		if (currentStep === WIZARD_STEP_TITLES.length - 1) {
			// TODO: Handle submission and navigation
			return;
		}
		goToNextStep();
	};

	const steps = [
		<ApplicationDetailsStep
			connectionStatus={connectionStatus}
			connectionStatusColor={connectionStatusColor}
			key={0}
		/>,
		<ApplicationStructureStep key={1} />,
		<KnowledgeBaseStep key={2} />,
		<ResearchPlanStep key={3} />,
		<ResearchDeepDiveStep key={4} />,
		<GenerateCompleteStep key={5} />,
	];

	if (isCreatingApplication) {
		return (
			<div className="flex h-screen w-screen items-center justify-center">
				<div className="text-center">
					<p className="text-muted-foreground">Initializing application...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-light flex h-screen w-screen flex-col" data-testid="wizard-page">
			<WizardHeader
				applicationName={applicationTitle || DEFAULT_APPLICATION_TITLE}
				currentStep={currentStep}
				showHeaderInfo={showHeaderInfo}
				stepTitles={WIZARD_STEP_TITLES}
			/>
			<section className="flex-1 overflow-auto" data-testid="step-content-container">
				{steps[currentStep]}
			</section>
			<WizardFooter
				currentStep={currentStep}
				disabled={!isCurrentStepValid()}
				onBack={goToPreviousStep}
				onContinue={handleNext}
				showBack={currentStep > 0}
			/>
		</div>
	);
}
