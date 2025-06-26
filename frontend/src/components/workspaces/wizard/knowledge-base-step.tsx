"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { IconPreviewLogo } from "@/components/workspaces/icons";
import FilePreviewCard from "@/components/workspaces/wizard/file-preview-card";
import LinkPreviewItem from "@/components/workspaces/wizard/link-preview-item";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { TemplateFileUploader } from "./template-file-uploader";
import { UrlInput } from "./url-input";

export function KnowledgeBaseStep() {
	const { application } = useApplicationStore();

	usePollingCleanup();

	const applicationId = application?.id;

	return (
		<div className="flex size-full" data-testid="knowledge-base-step">
			<div className="w-1/3 space-y-6 overflow-y-auto p-6 sm:w-1/2">
				<div className="space-y-6">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="knowledge-base-header"
						>
							Knowledge Base
						</h2>
						<p
							className="text-muted-foreground-dark leading-tight"
							data-testid="knowledge-base-description"
						>
							Upload your supporting materials, research, notes, slides, publications, bios, references,
							so we have full context. The more you share, the stronger your application.
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
				</div>
			</div>

			<KnowledgeBasePreview />
		</div>
	);
}

function DocumentsSection({ files, parentId }: { files: FileWithId[]; parentId?: string }) {
	if (files.length === 0) return null;

	return (
		<div data-testid="knowledge-base-files">
			<h4 className="font-heading mb-8 font-semibold">Documents</h4>
			<div className="grid grid-cols-5 gap-3" data-testid="file-collection">
				{files.map((file, index) => (
					<FilePreviewCard file={file} key={file.name + index.toString()} parentId={parentId} />
				))}
			</div>
		</div>
	);
}

function KnowledgeBasePreview() {
	const { application } = useApplicationStore();

	const applicationId = application?.id;

	const knowledgeBaseFiles: FileWithId[] = (application?.rag_sources ?? [])
		.filter((source) => source.filename)
		.map((source) => {
			const file = new File([], source.filename!, { type: "application/octet-stream" });
			return Object.assign(file, { id: source.sourceId });
		});

	const knowledgeBaseUrls = (application?.rag_sources ?? [])
		.filter((source) => source.url)
		.map((source) => source.url!);

	const hasContent = Boolean(application?.title) || knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;
	const hasFilesOrUrls = knowledgeBaseFiles.length > 0 || knowledgeBaseUrls.length > 0;
	const hasBothFilesAndUrls = knowledgeBaseFiles.length > 0 && knowledgeBaseUrls.length > 0;

	if (!hasContent) {
		return (
			<div className="bg-preview-bg flex h-full w-[70%] flex-col items-center justify-center gap-6 border-l border-gray-100 p-5 md:p-7">
				<IconPreviewLogo height={180} width={180} />
			</div>
		);
	}

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
			<ScrollArea className="flex-1">
				{hasFilesOrUrls && (
					<Card
						className="border-app-gray-100 border bg-white p-5 shadow-none"
						data-testid="knowledge-base-container"
					>
						<DocumentsSection files={knowledgeBaseFiles} parentId={applicationId} />
						{hasBothFilesAndUrls && (
							<Separator className="my-8 bg-gray-200" data-testid="knowledge-base-separator" />
						)}
						<LinksSection parentId={applicationId} urls={knowledgeBaseUrls} />
					</Card>
				)}
			</ScrollArea>
		</div>
	);
}

function LinksSection({ parentId, urls }: { parentId?: string; urls: string[] }) {
	if (urls.length === 0) return null;

	return (
		<div data-testid="knowledge-base-urls">
			<h4 className="font-heading mb-8 font-semibold">Links</h4>
			<div className="space-y-1">
				{urls.map((url, index) => (
					<LinkPreviewItem key={url + index.toString()} parentId={parentId} url={url} />
				))}
			</div>
		</div>
	);
}
