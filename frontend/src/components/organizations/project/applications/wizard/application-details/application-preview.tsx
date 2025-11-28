"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { FilePreviewCard } from "@/components/organizations/project/applications/wizard/file-preview-card";
import { LinkPreviewItem } from "@/components/organizations/project/applications/wizard/link-preview-item";
import { PendingFilePreviewCard } from "@/components/organizations/project/applications/wizard/pending-file-preview-card";
import { PreviewCard } from "@/components/organizations/project/applications/wizard/preview-card";
import { WizardBanner } from "@/components/organizations/project/applications/wizard/wizard-banner";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { ThemeBadge } from "@/components/shared/theme-badge";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { SourceIndexingStatus } from "@/enums";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId, FileWithSource, UrlWithSource } from "@/types/files";

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
	const grantSections = useApplicationStore((state) => state.application?.grant_template?.grant_sections);
	const pendingUploads = useApplicationStore((state) => state.pendingUploads.template);

	const [bannerDismissed, setBannerDismissed] = useState(false);

	const templateFiles: FileWithSource[] = useMemo(
		() =>
			(templateSources ?? [])
				.filter(
					(source) =>
						source.filename && (source.status as SourceIndexingStatus) !== SourceIndexingStatus.FAILED,
				)
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
				.filter(
					(source) => source.url && (source.status as SourceIndexingStatus) !== SourceIndexingStatus.FAILED,
				)
				.map((source) => ({
					sourceId: source.sourceId,
					sourceStatus: source.status,
					url: source.url!,
				})),
		[templateSources],
	);

	const pendingFiles = useMemo(() => [...pendingUploads], [pendingUploads]);

	const isEmpty = !draftTitle && templateFiles.length === 0 && templateUrls.length === 0 && pendingFiles.length === 0;
	const hasSections = (grantSections?.length ?? 0) > 0;
	const showBanner = hasSections && !bannerDismissed;

	if (isEmpty) {
		return (
			<WizardRightPane>
				<EmptyStatePreview />
			</WizardRightPane>
		);
	}

	return (
		<WizardRightPane padding="px-5 md:px-7 py-5 2xl:py-7">
			<div className="flex h-full flex-col">
				<div className="flex-shrink-0 mb-9 2xl:mb-11 flex flex-col items-start gap-2">
					{showBanner && (
						<WizardBanner
							onClose={() => {
								setBannerDismissed(true);
							}}
							variant="warning"
						>
							Any changes to the original uploaded data or linked sources will require regenerating the
							application.
						</WizardBanner>
					)}

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
						{connectionStatus && process.env.NODE_ENV === "development" && (
							<ThemeBadge className={`w-fit ${connectionStatusColor}`}>{connectionStatus}</ThemeBadge>
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
							{(templateFiles.length > 0 || pendingFiles.length > 0) && (
								<DocumentsCard
									{...(parentId ? { parentId } : {})}
									pendingFiles={pendingFiles}
									templateFiles={templateFiles}
								/>
							)}

							{templateUrls.length > 0 && (
								<LinksCard {...(parentId ? { parentId } : {})} templateUrls={templateUrls} />
							)}
						</div>
					</div>
				</div>
			</div>
		</WizardRightPane>
	);
}

function DocumentsCard({
	parentId,
	pendingFiles,
	templateFiles,
}: {
	parentId?: string;
	pendingFiles: FileWithId[];
	templateFiles: FileWithSource[];
}) {
	const parentProps = parentId ? { parentId } : {};
	return (
		<PreviewCard data-testid="application-documents">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Application Documents</h4>
			<div className="flex flex-wrap gap-3" data-testid="file-collection">
				{templateFiles.map((file, index) => (
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
		</PreviewCard>
	);
}

function LinksCard({ parentId, templateUrls }: { parentId?: string; templateUrls: UrlWithSource[] }) {
	const parentProps = parentId ? { parentId } : {};
	return (
		<PreviewCard data-testid="application-links">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Links</h4>
			<div className="grid grid-cols-2 gap-x-11">
				<div className="space-y-1">
					{templateUrls
						.filter((_, index) => index % 2 === 0)
						.map((urlSource, originalIndex) => (
							<LinkPreviewItem
								{...parentProps}
								key={urlSource.url + (originalIndex * 2).toString()}
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
								{...parentProps}
								key={urlSource.url + (originalIndex * 2 + 1).toString()}
								sourceStatus={urlSource.sourceStatus}
								url={urlSource.url}
							/>
						))}
				</div>
			</div>
		</PreviewCard>
	);
}
