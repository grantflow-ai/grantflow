"use client";

import Image from "next/image";
import { useMemo } from "react";
import { AppCard } from "@/components/app";
import { ThemeBadge } from "@/components/projects/shared/theme-badge";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { log } from "@/utils/logger";
import { FilePreviewCard } from "./file-preview-card";
import { LinkPreviewItem } from "./link-preview-item";

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
	log.info("ApplicationPreview render", { parentId });
	const templateSources = useApplicationStore((state) => state.application?.grant_template?.rag_sources);

	const templateFiles: FileWithId[] = useMemo(
		() =>
			(templateSources ?? [])
				.filter((source) => source.filename)
				.map((source) => {
					const file = new File([], source.filename!, { type: "application/octet-stream" });
					return Object.assign(file, { id: source.sourceId });
				}),
		[templateSources],
	);

	const templateUrls = useMemo(
		() => (templateSources ?? []).filter((source) => source.url).map((source) => source.url!),
		[templateSources],
	);

	const isEmpty = !draftTitle && templateFiles.length === 0 && templateUrls.length === 0;

	if (isEmpty) {
		return (
			<div className="bg-preview-bg flex min-h-0 h-full w-1/2 md:w-2/3 lg:w-3/4 flex-col border-l border-app-gray-100">
				<div className="flex flex-1 items-center justify-center p-5 md:p-7">
					<Image
						alt="Preview logo"
						height={180}
						src="/icons/preview-logo.svg"
						style={{ height: "auto", maxHeight: 180 }}
						width={180}
					/>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-preview-bg flex min-h-0 h-full w-1/2 md:w-2/3 lg:w-3/4 flex-col border-l border-app-gray-100">
			<div className="flex-shrink-0 mb-11 flex flex-col items-start gap-2 px-5 md:px-7 pt-5 md:pt-7">
				<div className="flex items-center gap-2">
					<ThemeBadge
						color="light"
						leftIcon={
							<Image alt="Draft in progress" height={12} src="/icons/application-title.svg" width={12} />
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
				<div className="overflow-y-auto h-full px-5 md:px-7 pb-5 md:pb-7">
					<div className="space-y-5">
						{templateFiles.length > 0 && (
							<DocumentsCard parentId={parentId} templateFiles={templateFiles} />
						)}

						{templateUrls.length > 0 && <LinksCard parentId={parentId} templateUrls={templateUrls} />}
					</div>
				</div>
			</div>
		</div>
	);
}

function DocumentsCard({ parentId, templateFiles }: { parentId?: string; templateFiles: FileWithId[] }) {
	return (
		<PreviewCard data-testid="application-documents">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Application Documents</h4>
			<div className="flex flex-wrap gap-3" data-testid="file-collection">
				{templateFiles.map((file, index) => (
					<FilePreviewCard file={file} key={file.name + index.toString()} parentId={parentId} />
				))}
			</div>
		</PreviewCard>
	);
}

function LinksCard({ parentId, templateUrls }: { parentId?: string; templateUrls: string[] }) {
	return (
		<PreviewCard data-testid="application-links">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Links</h4>
			<div className="grid grid-cols-2 gap-x-11">
				<div className="space-y-1">
					{templateUrls
						.filter((_, index) => index % 2 === 0)
						.map((url, originalIndex) => (
							<LinkPreviewItem key={url + (originalIndex * 2).toString()} parentId={parentId} url={url} />
						))}
				</div>
				<div className="space-y-1">
					{templateUrls
						.filter((_, index) => index % 2 === 1)
						.map((url, originalIndex) => (
							<LinkPreviewItem
								key={url + (originalIndex * 2 + 1).toString()}
								parentId={parentId}
								url={url}
							/>
						))}
				</div>
			</div>
		</PreviewCard>
	);
}

function PreviewCard({ children, ...props }: { children: React.ReactNode } & React.ComponentProps<typeof AppCard>) {
	return (
		<AppCard className="border-app-gray-100 border p-5 shadow-none gap-8 rounded-sm" {...props}>
			{children}
		</AppCard>
	);
}
