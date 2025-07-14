"use client";

import Image from "next/image";
import { useMemo } from "react";
import { ThemeBadge } from "@/components/projects/shared/theme-badge";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";
import { FilePreviewCard } from "./file-preview-card";
import { LinkPreviewItem } from "./link-preview-item";
import { PreviewCard } from "./preview-card";
import { WizardRightPane } from "./wizard-right-pane";

export function ApplicationPreview({
	connectionStatus,
	connectionStatusColor,
	draftTitle,
	parentId,
}: {
	connectionStatus?: string;
	connectionStatusColor?: string;
	draftTitle: string;
	parentId?: string;
}) {
	const templateSources = useApplicationStore((state) => state.application?.grant_template?.rag_sources);

	const templateFiles: FileWithSource[] = useMemo(
		() =>
			(templateSources ?? [])
				.filter((source) => source.filename && source.status !== SourceIndexingStatus.FAILED)
				.map((source) => {
					const file = new File([], source.filename!, { type: "application/octet-stream" });
					return Object.assign(file, {
						id: source.sourceId,
						sourceId: source.sourceId,
						sourceStatus: source.status,
					});
				}),
		[templateSources],
	);

	const templateUrls: UrlWithSource[] = useMemo(
		() =>
			(templateSources ?? [])
				.filter((source) => source.url && source.status !== SourceIndexingStatus.FAILED)
				.map((source) => ({
					sourceId: source.sourceId,
					sourceStatus: source.status,
					url: source.url!,
				})),
		[templateSources],
	);

	const isEmpty = !draftTitle && templateFiles.length === 0 && templateUrls.length === 0;

	if (isEmpty) {
		return (
			<WizardRightPane>
				<EmptyStatePreview />
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="px-5 md:px-7 py-5 md:py-7">
			<div className="flex h-full flex-col">
				<div className="flex-shrink-0 mb-11 flex flex-col items-start gap-2">
					<div className="flex items-center gap-2">
						<ThemeBadge
							color="light"
							leftIcon={
								<Image
									alt="Draft in progress"
									height={12}
									src="/icons/application-title.svg"
									width={12}
								/>
							}
						>
							Application Title
						</ThemeBadge>
						{connectionStatus && (
							<ThemeBadge className={`w-fit ${connectionStatusColor} text-white`}>
								{connectionStatus}
							</ThemeBadge>
						)}
					</div>
					<h3
						className={`font-heading text-3xl font-medium leading-[34px] ${draftTitle ? "" : "text-muted-foreground-dark/50"}`}
						data-testid="application-title"
					>
						{draftTitle || "Untitled Application"}
					</h3>
				</div>

				<div className="flex-1 min-h-0 relative">
					<div className="overflow-y-auto h-full">
						<div className="space-y-5">
							{templateFiles.length > 0 && (
								<DocumentsCard parentId={parentId} templateFiles={templateFiles} />
							)}

							{templateUrls.length > 0 && <LinksCard parentId={parentId} templateUrls={templateUrls} />}
						</div>
					</div>
				</div>
			</div>
		</WizardRightPane>
	);
}

function DocumentsCard({ parentId, templateFiles }: { parentId?: string; templateFiles: FileWithSource[] }) {
	return (
		<PreviewCard data-testid="application-documents">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Application Documents</h4>
			<div className="flex flex-wrap gap-3" data-testid="file-collection">
				{templateFiles.map((file, index) => (
					<FilePreviewCard
						file={file}
						key={file.name + index.toString()}
						parentId={parentId}
						sourceStatus={file.sourceStatus}
					/>
				))}
			</div>
		</PreviewCard>
	);
}

function LinksCard({ parentId, templateUrls }: { parentId?: string; templateUrls: UrlWithSource[] }) {
	return (
		<PreviewCard data-testid="application-links">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Links</h4>
			<div className="grid grid-cols-2 gap-x-11">
				<div className="space-y-1">
					{templateUrls
						.filter((_, index) => index % 2 === 0)
						.map((urlSource, originalIndex) => (
							<LinkPreviewItem
								key={urlSource.url + (originalIndex * 2).toString()}
								parentId={parentId}
								sourceStatus={urlSource.sourceStatus}
								url={urlSource.url}
							/>
						))}
				</div>
				<div className="space-y-1">
					{templateUrls
						.filter((_, index) => index % 2 === 1)
						.map((urlSource, originalIndex) => (
							<LinkPreviewItem
								key={urlSource.url + (originalIndex * 2 + 1).toString()}
								parentId={parentId}
								sourceStatus={urlSource.sourceStatus}
								url={urlSource.url}
							/>
						))}
				</div>
			</div>
		</PreviewCard>
	);
}
