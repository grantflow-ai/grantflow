"use client";

import { FilePreviewCard } from "@/components/organizations/project/applications/wizard/file-preview-card";
import { LinkPreviewItem } from "@/components/organizations/project/applications/wizard/link-preview-item";
import { PendingFilePreviewCard } from "@/components/organizations/project/applications/wizard/pending-file-preview-card";
import { PreviewCard } from "@/components/organizations/project/applications/wizard/preview-card";
import { TemplateFileUploader } from "@/components/organizations/project/applications/wizard/template-file-uploader";
import { UrlInput } from "@/components/organizations/project/applications/wizard/url-input";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { Separator } from "@/components/ui/separator";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";

export function KnowledgeBaseStep() {
	const application = useApplicationStore((state) => state.application);

	const applicationId = application?.id;

	return (
		<div className="flex size-full" data-testid="knowledge-base-step">
			<WizardLeftPane>
				<div>
					<h2 className="font-heading text-2xl font-medium leading-loose" data-testid="knowledge-base-header">
						Knowledge Base
					</h2>
					<p className="text-muted-foreground-dark leading-tight" data-testid="knowledge-base-description">
						Upload your supporting materials, research, notes, slides, publications, bios, references, so we
						have full context. The more you share, the stronger your application.
					</p>
				</div>

				<div className="space-y-6">
					<div>
						<h3
							className="font-heading mb-5 text-base font-semibold leading-snug"
							data-testid="documents-title"
						>
							Documents
						</h3>
						<TemplateFileUploader
							{...(applicationId ? { parentId: applicationId } : {})}
							sourceType="application"
						/>
					</div>

					<div>
						<h3 className="font-heading text-base font-semibold leading-snug" data-testid="links-title">
							Links
						</h3>
						<p
							className="text-muted-foreground-dark mb-5 text-sm leading-none"
							data-testid="links-subtitle"
						>
							Use a static link that doesn&apos;t require login, so we can retrieve the information.
						</p>

						<UrlInput {...(applicationId ? { parentId: applicationId } : {})} />
					</div>
				</div>
			</WizardLeftPane>

			<KnowledgeBasePreview />
		</div>
	);
}

function KnowledgeBasePreview() {
	const applicationId = useApplicationStore((state) => state.application?.id);
	const applicationRagSources = useApplicationStore((state) => state.application?.rag_sources);
	const pendingUploads = useApplicationStore((state) => state.pendingUploads.application);

	const knowledgeBaseFiles: FileWithSource[] = (applicationRagSources ?? [])
		.filter((source) => source.filename && (source.status as SourceIndexingStatus) !== SourceIndexingStatus.FAILED)
		.map((source) => {
			const file = new File([], source.filename!, { type: "application/octet-stream" });
			return Object.assign(file, {
				id: source.sourceId,
				sourceId: source.sourceId,
				sourceStatus: source.status,
			});
		});

	const knowledgeBaseUrls: UrlWithSource[] = (applicationRagSources ?? [])
		.filter((source) => source.url && (source.status as SourceIndexingStatus) !== SourceIndexingStatus.FAILED)
		.map((source) => ({
			sourceId: source.sourceId,
			sourceStatus: source.status,
			url: source.url!,
		}));

	const pendingFiles = [...pendingUploads];
	const hasFilesOrUrls = knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0 || pendingFiles.length > 0;
	const hasBothFilesAndUrls = knowledgeBaseFiles.length > 0 && knowledgeBaseUrls.length > 0;
	const parentProps = applicationId ? { parentId: applicationId } : {};

	if (!hasFilesOrUrls) {
		return (
			<WizardRightPane>
				<EmptyStatePreview />
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="p-6 md:p-4">
			<div className="flex-1 min-h-0 overflow-y-auto h-full">
				<div className="space-y-5">
					<PreviewCard data-testid="knowledge-base-container">
						{(knowledgeBaseFiles.length > 0 || pendingFiles.length > 0) && (
							<>
								<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">
									Documents
								</h4>
								<div className="flex flex-wrap gap-3" data-testid="knowledge-base-files">
									{knowledgeBaseFiles.map((file, index) => (
										<FilePreviewCard
											{...parentProps}
											file={file}
											key={file.name + index.toString()}
											sourceStatus={file.sourceStatus}
										/>
									))}
									{pendingFiles.map((file) => (
										<PendingFilePreviewCard file={file} key={`pending-${file.id}`} />
									))}
								</div>
							</>
						)}

						{hasBothFilesAndUrls && (
							<Separator className="bg-gray-200" data-testid="knowledge-base-separator" />
						)}

						{knowledgeBaseUrls.length > 0 && (
							<>
								<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">
									Links
								</h4>
								<div className="grid grid-cols-2 gap-x-11" data-testid="knowledge-base-urls">
									<div className="space-y-1">
										{knowledgeBaseUrls
											.filter((_, index) => index % 2 === 0)
											.map((urlSource, index) => (
												<LinkPreviewItem
													{...parentProps}
													key={urlSource.url + index.toString()}
													sourceStatus={urlSource.sourceStatus}
													url={urlSource.url}
												/>
											))}
									</div>
									<div className="space-y-1">
										{knowledgeBaseUrls
											.filter((_, index) => index % 2 === 1)
											.map((urlSource, index) => (
												<LinkPreviewItem
													{...parentProps}
													key={urlSource.url + index.toString()}
													sourceStatus={urlSource.sourceStatus}
													url={urlSource.url}
												/>
											))}
									</div>
								</div>
							</>
						)}
					</PreviewCard>
				</div>
			</div>
		</WizardRightPane>
	);
}
