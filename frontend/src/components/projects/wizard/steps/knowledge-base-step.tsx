"use client";

import { FilePreviewCard, LinkPreviewItem, TemplateFileUploader } from "@/components/projects";
import { PreviewCard, WizardLeftPane, WizardRightPane } from "@/components/projects/wizard/shared";
import { Separator } from "@/components/ui/separator";
import { SourceIndexingStatus } from "@/enums";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";
import { UrlInput } from "../shared/url-input";

export function KnowledgeBaseStep() {
	const application = useApplicationStore((state) => state.application);

	usePollingCleanup();

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
						<TemplateFileUploader parentId={applicationId} />
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

						<UrlInput parentId={applicationId} />
					</div>
				</div>
			</WizardLeftPane>

			<KnowledgeBasePreview />
		</div>
	);
}

function KnowledgeBasePreview() {
	const applicationTitle = useApplicationStore((state) => state.application?.title);
	const applicationId = useApplicationStore((state) => state.application?.id);
	const applicationRagSources = useApplicationStore((state) => state.application?.rag_sources);

	const knowledgeBaseFiles: FileWithSource[] = (applicationRagSources ?? [])
		.filter((source) => source.filename && source.status !== SourceIndexingStatus.FAILED)
		.map((source) => {
			const file = new File([], source.filename!, { type: "application/octet-stream" });
			return Object.assign(file, {
				id: source.sourceId,
				sourceId: source.sourceId,
				sourceStatus: source.status,
			});
		});

	const knowledgeBaseUrls: UrlWithSource[] = (applicationRagSources ?? [])
		.filter((source) => source.url && source.status !== SourceIndexingStatus.FAILED)
		.map((source) => ({
			sourceId: source.sourceId,
			sourceStatus: source.status,
			url: source.url!,
		}));

	const hasContent = Boolean(applicationTitle) || knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;
	const hasFilesOrUrls = knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;
	const hasBothFilesAndUrls = knowledgeBaseFiles.length > 0 && knowledgeBaseUrls.length > 0;

	if (!hasContent) {
		return (
			<WizardRightPane padding="p-4 md:p-6">
				<div className="flex h-full flex-col items-center justify-center gap-6">
					<div className="relative">
						<div className="flex size-96 items-center justify-center">
							<div className="relative">
								{}
								<div className="bg-gray-100 animate-pulse flex size-24 items-center justify-center rounded-full">
									<div className="bg-gray-200 size-12 rounded-full" />
								</div>

								{}
								<div className="absolute inset-0 animate-spin" style={{ animationDuration: "3s" }}>
									<div className="bg-blue-100 absolute -top-4 left-1/2 size-8 -translate-x-1/2 rounded-full" />
								</div>
								<div
									className="absolute inset-0 animate-spin"
									style={{ animationDirection: "reverse", animationDuration: "4s" }}
								>
									<div className="bg-purple-100 absolute -bottom-4 left-1/2 size-6 -translate-x-1/2 rounded-full" />
								</div>
								<div className="absolute inset-0 animate-spin" style={{ animationDuration: "5s" }}>
									<div className="bg-green-100 absolute -left-4 top-1/2 size-4 -translate-y-1/2 rounded-full" />
								</div>
							</div>
						</div>
					</div>
				</div>
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="p-6 md:p-4">
			<div className="flex-1 min-h-0 overflow-y-auto h-full">
				<div className="space-y-5">
					{hasFilesOrUrls && (
						<PreviewCard data-testid="knowledge-base-container">
							{knowledgeBaseFiles.length > 0 && (
								<>
									<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">
										Documents
									</h4>
									<div className="flex flex-wrap gap-3" data-testid="knowledge-base-files">
										{knowledgeBaseFiles.map((file, index) => (
											<FilePreviewCard
												file={file}
												key={file.name + index.toString()}
												parentId={applicationId}
												sourceStatus={file.sourceStatus}
											/>
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
														key={urlSource.url + index.toString()}
														parentId={applicationId}
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
														key={urlSource.url + index.toString()}
														parentId={applicationId}
														sourceStatus={urlSource.sourceStatus}
														url={urlSource.url}
													/>
												))}
										</div>
									</div>
								</>
							)}
						</PreviewCard>
					)}
				</div>
			</div>
		</WizardRightPane>
	);
}
