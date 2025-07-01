"use client";

import { useEffect, useState } from "react";
import AppTextArea from "@/components/app/forms/textarea-field";
import { ApplicationPreview, TemplateFileUploader } from "@/components/projects";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import { UrlInput } from "../shared/url-input";

const TITLE_MAX_LENGTH = 120;

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
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-[30px] text-text-primary"
							data-testid="application-title-header"
						>
							Application Title
						</h2>
						<p
							className="text-text-secondary text-sm leading-[18px]"
							data-testid="application-title-description"
						>
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
						rows={4}
						showCount
						testId="application-title-textarea"
						value={draftTitle}
					/>
				</div>

				<div className="space-y-6">
					<h2
						className="font-heading text-2xl font-medium leading-[30px] text-text-primary"
						data-testid="application-instructions-header"
					>
						Application Instructions
					</h2>

					<div>
						<h3 className="font-heading mb-1 text-base font-semibold leading-[22px] text-text-primary">
							Documents
						</h3>
						<p className="text-text-secondary mb-5 text-sm leading-[18px]">
							Upload the official Call for Proposals or any relevant documents (PDF, Doc). We&apos;ll
							analyze these to extract key requirements for your application.
						</p>
						<TemplateFileUploader parentId={grantTemplateId} />
					</div>

					<div>
						<h3 className="font-heading text-base font-semibold leading-[22px] text-text-primary">Links</h3>
						<p className="text-text-secondary mb-5 text-sm leading-[18px]">
							Paste links to any online guidelines or application portals. These will help us better
							understand the funding requirements.
						</p>

						<UrlInput parentId={grantTemplateId} />
					</div>
				</div>
			</div>

			<ApplicationPreview
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				draftTitle={draftTitle}
				parentId={grantTemplateId}
			/>
		</div>
	);
}
