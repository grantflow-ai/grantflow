"use client";

import AppTextArea from "@/components/app/forms/textarea-field";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";

import { ApplicationPreview } from "../shared/application-preview";
import { TemplateFileUploader } from "../shared/template-file-uploader";
import { UrlInput } from "../shared/url-input";

const TITLE_MAX_LENGTH = 120;

interface ApplicationDetailsStepProps {
	connectionStatus?: string;
	connectionStatusColor?: string;
}

export function ApplicationDetailsStep({ connectionStatus, connectionStatusColor }: ApplicationDetailsStepProps) {
	const handleTitleChange = useWizardStore((state) => state.handleTitleChange);
	const application = useApplicationStore((state) => state.application);
	const applicationTitle = application?.title ?? "";

	usePollingCleanup();

	const parentId = application?.grant_template?.id;

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
							handleTitleChange(e.target.value);
						}}
						placeholder="Title of your grant application"
						rows={4}
						showCount
						testId="application-title-textarea"
						value={applicationTitle}
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
						<TemplateFileUploader parentId={parentId} />
					</div>

					<div>
						<h3 className="font-heading text-base font-semibold leading-[22px] text-text-primary">Links</h3>
						<p className="text-text-secondary mb-5 text-sm leading-[18px]">
							Paste links to any online guidelines or application portals. These will help us better
							understand the funding requirements.
						</p>

						<UrlInput parentId={parentId} />
					</div>
				</div>
			</div>

			<ApplicationPreview
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				parentId={parentId}
			/>
		</div>
	);
}