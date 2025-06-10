"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { createApplication, updateApplication } from "@/actions/grant-applications";
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
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";

const WIZARD_STEP_TITLES = [
	"Application Details",
	"Application Structure",
	"Knowledge Base",
	"Research Plan",
	"Research Deep Dive",
	"Generate and Complete",
] as const;

const DEBOUNCE_DELAY_MS = 500;
const INITIAL_STEP = 0;
const DEFAULT_APPLICATION_TITLE = "Untitled Application";

export default function CreateGrantApplicationWizardPage() {
	const params = useParams<{ workspaceId: string }>();
	const router = useRouter();

	const [currentStep, setCurrentStep] = useState<number>(INITIAL_STEP);
	const [applicationTitle, setApplicationTitle] = useState("");
	const [urls, setUrls] = useState<string[]>([]);
	const [fileCount, setFileCount] = useState(0);
	const [applicationId, setApplicationId] = useState<null | string>(null);
	const [templateId, setTemplateId] = useState<null | string>(null);
	const [isCreatingApplication, setIsCreatingApplication] = useState(true);

	const showHeaderInfo = currentStep > INITIAL_STEP;

	// Use the notifications hook once we have an applicationId
	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId,
		workspaceId: params.workspaceId,
	});

	// Create application on mount
	useEffect(() => {
		const initializeApplication = async () => {
			try {
				// Create a draft application with empty title
				const response = await createApplication(params.workspaceId, {
					title: DEFAULT_APPLICATION_TITLE,
				});
				setApplicationId(response.id);
				setTemplateId(response.template_id);
				setIsCreatingApplication(false);
			} catch {
				toast.error("Failed to initialize application. Please try again.");
				router.push(`/workspaces/${params.workspaceId}`);
			}
		};

		void initializeApplication();
	}, [params.workspaceId, router]);

	// Update application title when it changes
	useEffect(() => {
		if (!applicationId || !applicationTitle.trim()) {
			return;
		}

		const updateTitle = async () => {
			try {
				await updateApplication(params.workspaceId, applicationId, {
					title: applicationTitle,
				});
			} catch {
				toast.error("Failed to update application title");
			}
		};

		// Debounce the update
		const timeoutId = setTimeout(updateTitle, DEBOUNCE_DELAY_MS);
		return () => {
			clearTimeout(timeoutId);
		};
	}, [applicationTitle, applicationId, params.workspaceId]);

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

	// Validation logic for step 1
	const isStep1Valid = applicationTitle.trim().length > 0 && (urls.length > 0 || fileCount > 0);

	// Determine if the current step is valid
	const isCurrentStepValid = () => {
		switch (currentStep) {
			case 0: {
				return isStep1Valid;
			}
			default: {
				return true;
			} // Other steps don't have validation yet
		}
	};

	const handleBack = () => {
		setCurrentStep((s) => Math.max(INITIAL_STEP, s - 1));
	};

	const handleNext = () => {
		if (currentStep === WIZARD_STEP_TITLES.length - 1) {
			// TODO: Handle submission and navigation
			return;
		}
		setCurrentStep((s) => Math.min(WIZARD_STEP_TITLES.length - 1, s + 1));
	};

	const steps = [
		<ApplicationDetailsStep
			applicationTitle={applicationTitle}
			connectionStatus={connectionStatus}
			connectionStatusColor={connectionStatusColor}
			fileCount={fileCount}
			key={0}
			onApplicationTitleChange={setApplicationTitle}
			onFileCountChange={setFileCount}
			onUrlsChange={setUrls}
			templateId={templateId ?? ""}
			urls={urls}
			workspaceId={params.workspaceId}
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
				applicationName={applicationTitle || "New Application"}
				currentStep={currentStep}
				showHeaderInfo={showHeaderInfo}
				stepTitles={WIZARD_STEP_TITLES as unknown as string[]}
			/>
			<section className="flex-1 overflow-auto p-6" data-testid="step-content-container">
				{steps[currentStep]}
			</section>
			<WizardFooter
				currentStep={currentStep}
				disabled={!isCurrentStepValid()}
				onBack={handleBack}
				onContinue={handleNext}
				showBack={currentStep > INITIAL_STEP}
			/>
		</div>
	);
}
