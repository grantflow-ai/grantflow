"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { createApplication, retrieveApplication, updateApplication } from "@/actions/grant-applications";
import { generateGrantTemplate } from "@/actions/grant-template";
import {
	ApplicationDetailsStep,
	ApplicationStructureStep,
	GenerateCompleteStep,
	KnowledgeBaseStep,
	ResearchDeepDiveStep,
	ResearchPlanStep,
} from "@/components/workspaces/wizard";
import { FileWithId } from "@/components/workspaces/wizard/application-preview";
import { WizardFooter, WizardHeader } from "@/components/workspaces/wizard-wrapper-components";
import { WIZARD_STEP_TITLES } from "@/constants";
import { SourceIndexingStatus } from "@/enums";
import {
	isSourceProcessingNotificationMessage,
	useApplicationNotifications,
} from "@/hooks/use-application-notifications";
import { API } from "@/types/api-types";
import { logError } from "@/utils/logging";

const DEBOUNCE_DELAY_MS = 500;
const INITIAL_STEP = 0;
const DEFAULT_APPLICATION_TITLE = "Untitled Application";
const MIN_TITLE_LENGTH = 10;

type ApplicationType = API.CreateApplication.Http201.ResponseBody | API.RetrieveApplication.Http200.ResponseBody | null;

// we export this function to allow us to test the logic in isolation
export const validateStepNext = ({
	application,
	currentStep,
	hadUrls,
	hasFiles,
	isGenerating,
}: {
	application: ApplicationType | null;
	currentStep: number;
	hadUrls: boolean;
	hasFiles: boolean;
	isGenerating: boolean;
}) => {
	if (!application || isGenerating) {
		return false;
	}
	if (currentStep === 0) {
		return application.title.trim().length >= MIN_TITLE_LENGTH && (hadUrls || hasFiles);
	}
	if (currentStep === 1) {
		return !!application.grant_template?.grant_sections.length;
	}
	if (currentStep === 2) {
		return (
			!!application.rag_sources.length && application.rag_sources.every((source) => source.status !== "FAILED")
		);
	}
};

export default function CreateGrantApplicationWizardPage() {
	const params = useParams<{ workspaceId: string }>();
	const searchParams = useSearchParams();
	const router = useRouter();

	const [application, setApplication] = useState<ApplicationType | null>(null);
	const [currentStep, setCurrentStep] = useState<number>(INITIAL_STEP);
	const [applicationTitle, setApplicationTitle] = useState("");
	const [urls, setUrls] = useState<string[]>([]);
	const [uploadedFiles, setUploadedFiles] = useState<FileWithId[]>([]);
	const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

	const showHeaderInfo = currentStep > INITIAL_STEP;

	const { connectionStatus, connectionStatusColor, notifications } = useApplicationNotifications({
		applicationId: application?.id,
		workspaceId: params.workspaceId,
	});

	// Get or create an application on mount ~keep
	useEffect(() => {
		const applicationId = searchParams.get("applicationId");
		const handleApplication = async () => {
			try {
				if (applicationId) {
					const response = await retrieveApplication(params.workspaceId, applicationId);
					setApplication(response);
				} else {
					const response = await createApplication(params.workspaceId, {
						title: DEFAULT_APPLICATION_TITLE,
					});
					setApplication(response);
				}
			} catch (e: unknown) {
				logError({ error: e, identifier: "application-wizard-init" });
				toast.error(applicationId ? "Failed to retrieve application" : "Failed to initialize application");
				router.push(`/workspaces/${params.workspaceId}`);
			}
		};
		void handleApplication();
	}, [params.workspaceId, router, application, searchParams]);

	useEffect(() => {
		if (!application?.id || !applicationTitle.trim()) {
			return;
		}

		const updateTitle = async () => {
			try {
				await updateApplication(params.workspaceId, application.id, {
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
	}, [applicationTitle, application?.id, params.workspaceId]);

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

	const handleBack = () => {
		setCurrentStep((s) => Math.max(INITIAL_STEP, s - 1));
	};

	const handleNext = () => {
		if (currentStep === WIZARD_STEP_TITLES.length - 1) {
			// TODO: Handle submission and navigation
			return;
		}

		if (currentStep === 0 && application?.grant_template && !application.grant_template.grant_sections.length) {
			setIsGeneratingTemplate(true);
			try {
				void generateGrantTemplate(params.workspaceId, application.id, application.grant_template.id);
				setCurrentStep((s) => Math.min(WIZARD_STEP_TITLES.length - 1, s + 1));
			} catch {
				toast.error("Failed to generate grant template. Please try again.");
			} finally {
				setIsGeneratingTemplate(false);
			}
		} else {
			setCurrentStep((s) => Math.min(WIZARD_STEP_TITLES.length - 1, s + 1));
		}
	};

	const steps = [
		<ApplicationDetailsStep
			applicationTitle={applicationTitle}
			connectionStatus={connectionStatus}
			connectionStatusColor={connectionStatusColor}
			key={0}
			onApplicationTitleChange={setApplicationTitle}
			onUploadedFilesChange={setUploadedFiles}
			onUrlsChange={setUrls}
			templateId={application?.grant_template?.id ?? ""}
			uploadedFiles={uploadedFiles}
			urls={urls}
			workspaceId={params.workspaceId}
		/>,
		<ApplicationStructureStep key={1} />,
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
				disabled={
					!validateStepNext({
						application,
						currentStep,
						hadUrls: urls.length > 0,
						hasFiles: uploadedFiles.length > 0,
						isGenerating: isGeneratingTemplate,
					})
				}
				onBack={handleBack}
				onContinue={handleNext}
				showBack={currentStep > INITIAL_STEP}
			/>
		</div>
	);
}
