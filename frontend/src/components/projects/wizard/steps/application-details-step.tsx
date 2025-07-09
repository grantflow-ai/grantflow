"use client";

import { useEffect, useState } from "react";
import AppTextArea from "@/components/app/forms/textarea-field";
import { ApplicationPreview, TemplateFileUploader } from "@/components/projects/wizard/shared";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { cn } from "@/lib/utils";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { UrlInput } from "../shared/url-input";

const TITLE_MAX_LENGTH = 120;

const descriptionStyles = "text-muted-foreground-dark text-sm leading-none";
const uploadPaneHeadingStyles = "font-heading text-2xl font-medium leading-loose text-stone-900";
const subHeadingStyles = "font-heading text-base font-semibold leading-snug text-stone-900";

export function ApplicationDetailsStep({
	connectionStatus,
	connectionStatusColor,
}: {
	connectionStatus?: string;
	connectionStatusColor?: string;
}) {
	const handleTitleChange = useWizardStore((state) => state.handleTitleChange);

	const applicationTitle = useApplicationStore((state) => state.application?.title);
	const grantTemplateId = useApplicationStore((state) => state.application?.grant_template?.id);

	const [draftTitle, setDraftTitle] = useState("");
	const [showError, setShowError] = useState(false);
	const [attemptedContinue, setAttemptedContinue] = useState(false);

	useEffect(() => {
		if (applicationTitle !== undefined) {
			setDraftTitle(applicationTitle);
		}
	}, [applicationTitle]);

	useEffect(() => {
		// Listen for validation attempts
		const handleValidation = () => {
			if (draftTitle.trim().length < 10) {
				setShowError(true);
				setAttemptedContinue(true);
			}
		};

		// Add event listener for continue button clicks
		const continueButton = document.querySelector('[data-testid="continue-button"]');
		continueButton?.addEventListener("click", handleValidation);

		return () => {
			continueButton?.removeEventListener("click", handleValidation);
		};
	}, [draftTitle]);

	const handleInputChange = (value: string) => {
		setDraftTitle(value);
		handleTitleChange(value);
		// Show error if title is too short and user has attempted to continue or typed something
		if ((attemptedContinue || value.length > 0) && value.trim().length < 10) {
			setShowError(true);
		} else {
			setShowError(false);
		}
	};

	usePollingCleanup();

	return (
		<div className="flex size-full" data-testid="application-details-step">
			<UploadPane
				draftTitle={draftTitle}
				grantTemplateId={grantTemplateId}
				handleInputChange={handleInputChange}
				showError={showError}
			/>

			<ApplicationPreview
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				draftTitle={draftTitle}
				parentId={grantTemplateId}
			/>
		</div>
	);
}

function UploadPane({
	draftTitle,
	grantTemplateId,
	handleInputChange,
	showError,
}: {
	draftTitle: string;
	grantTemplateId?: string;
	handleInputChange: (value: string) => void;
	showError: boolean;
}) {
	return (
		<div className="w-1/2 md:w-1/3 lg:w-1/4 h-full flex flex-col">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-6">
					<div className="space-y-5">
						<div>
							<h2 className={uploadPaneHeadingStyles} data-testid="application-title-header">
								Application Title
							</h2>
							<p className={descriptionStyles} data-testid="application-title-description">
								Give your application file a clear, descriptive name.
							</p>
						</div>

						<AppTextArea
							className="min-h-32"
							countType="chars"
							id="application-title-textarea"
							label="Application Title"
							maxCount={TITLE_MAX_LENGTH}
							onChange={(e) => {
								handleInputChange(e.target.value);
							}}
							placeholder="Title of your grant application"
							showCount
							testId="application-title-textarea"
							value={draftTitle}
						/>
						{showError && (
							<p className="text-red-500 text-sm mt-1">
								{draftTitle.trim().length === 0
									? "Title is required"
									: "Title is required and must be at least 10 characters"}
							</p>
						)}
					</div>

					<div className="space-y-5">
						<h2 className={uploadPaneHeadingStyles} data-testid="application-instructions-header">
							Application Instructions
						</h2>

						<div>
							<h3 className={subHeadingStyles}>Documents</h3>
							<p className={descriptionStyles}>
								Upload the official Call for Proposals or any relevant documents (PDF, Doc). We&apos;ll
								analyze these to extract key requirements for your application.
							</p>
							<TemplateFileUploader parentId={grantTemplateId} />
						</div>

						<div>
							<h3 className={subHeadingStyles}>Links</h3>
							<p className={cn(descriptionStyles, "mb-5")}>
								Paste links to any online guidelines or application portals. These will help us better
								understand the funding requirements.
							</p>

							<UrlInput parentId={grantTemplateId} />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
