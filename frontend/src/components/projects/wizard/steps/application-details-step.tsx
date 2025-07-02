"use client";

import { useEffect, useState } from "react";
import AppTextArea from "@/components/app/forms/textarea-field";
import { ApplicationPreview, TemplateFileUploader } from "@/components/projects";
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

	useEffect(() => {
		if (applicationTitle !== undefined) {
			setDraftTitle(applicationTitle);
		}
	}, [applicationTitle]);

	const handleInputChange = (value: string) => {
		setDraftTitle(value);
		handleTitleChange(value);
	};

	usePollingCleanup();

	return (
		<div className="flex size-full" data-testid="application-details-step">
			<UploadPane
				draftTitle={draftTitle}
				grantTemplateId={grantTemplateId}
				handleInputChange={handleInputChange}
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
}: {
	draftTitle: string;
	grantTemplateId?: string;
	handleInputChange: (value: string) => void;
}) {
	return (
		<div className="w-1/3 max-w-1/3 p-6 sm:w-1/2 space-y-6">
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
					countType="chars"
					id="application-title-textarea"
					label="Application Title"
					maxCount={TITLE_MAX_LENGTH}
					onChange={(e) => {
						handleInputChange(e.target.value);
					}}
					placeholder="Title of your grant application"
					rows={16}
					showCount
					testId="application-title-textarea"
					value={draftTitle}
				/>
			</div>

			<div className="space-y-5">
				<h2 className={uploadPaneHeadingStyles} data-testid="application-instructions-header">
					Application Instructions
				</h2>

				<div>
					<h3 className={subHeadingStyles}>Documents</h3>
					<p className={descriptionStyles}>
						Upload the official Call for Proposals or any relevant documents (PDF, Doc). We&apos;ll analyze
						these to extract key requirements for your application.
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
	);
}
