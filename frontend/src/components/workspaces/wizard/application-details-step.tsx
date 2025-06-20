"use client";

import { useCallback, useEffect } from "react";

import AppTextArea from "@/components/textarea-field";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithId } from "@/types/files";
import { useDebounce } from "@/utils/debounce";
import { ApplicationPreview } from "./application-preview";
import { TemplateFileUploader } from "./template-file-uploader";
import { UrlInput } from "./url-input";

const RETRIEVE_DEBOUNCE_MS = 1000;
const POLLING_INTERVAL_DURATION = 3000;
const TITLE_MAX_LENGTH = 120;

interface ApplicationDetailsStepProps {
	connectionStatus?: string;
	connectionStatusColor?: string;
}

export function ApplicationDetailsStep({ connectionStatus, connectionStatusColor }: ApplicationDetailsStepProps) {
	const {
		handleTitleChange,
		polling: { start, stop },
	} = useWizardStore();
	const { application, applicationTitle, areFilesOrUrlsIndexing, removeFile, removeUrl, retrieveApplication } =
		useApplicationStore();

	const getIndexingStatus = useCallback(async () => {
		if (application) {
			await retrieveApplication(application.workspace_id, application.id);
		}
		return areFilesOrUrlsIndexing();
	}, [retrieveApplication, areFilesOrUrlsIndexing, application]);

	const handleRetrieveWithPolling = useCallback(async () => {
		const isIndexing = await getIndexingStatus();

		if (isIndexing) {
			start(handleRetrieveWithPolling, POLLING_INTERVAL_DURATION, false);
		} else {
			stop();
		}
	}, [getIndexingStatus, start, stop]);

	const debouncedRetrieveApplication = useDebounce(handleRetrieveWithPolling, RETRIEVE_DEBOUNCE_MS);

	const handleDocumentChange = useCallback(() => {
		debouncedRetrieveApplication();
	}, [debouncedRetrieveApplication]);

	useEffect(() => {
		return () => {
			stop();
		};
	}, [stop]);

	const handleRemoveUrl = useCallback(
		async (urlToRemove: string) => {
			await removeUrl(urlToRemove);
		},
		[removeUrl],
	);

	const handleFileRemove = useCallback(
		async (fileToRemove: FileWithId) => {
			await removeFile(fileToRemove);
		},
		[removeFile],
	);

	return (
		<div className="flex size-full" data-testid="application-details-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="application-title-header"
						>
							Application Title
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
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
					<h2 className="font-heading text-2xl font-medium leading-loose">Application Instructions</h2>

					<div>
						<h3 className="font-heading mb-1 text-base font-semibold leading-snug">Documents</h3>
						<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
							Upload the official Call for Proposals or any relevant documents (PDF, Doc). We&apos;ll
							analyze these to extract key requirements for your application.
						</p>
						<TemplateFileUploader onUploadComplete={handleDocumentChange} />
					</div>

					<div>
						<h3 className="font-heading text-base font-semibold leading-snug">Links</h3>
						<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
							Paste links to any online guidelines or application portals. These will help us better
							understand the funding requirements.
						</p>

						<UrlInput onUrlAdded={handleDocumentChange} />
					</div>
				</div>
			</div>

			<ApplicationPreview
				connectionStatus={connectionStatus}
				connectionStatusColor={connectionStatusColor}
				onFileRemove={handleFileRemove}
				onUrlRemove={handleRemoveUrl}
			/>
		</div>
	);
}