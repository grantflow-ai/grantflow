"use client";

import { useMemo } from "react";
import { AppCard } from "@/components/app";
import { IconApplication, IconPreviewLogo } from "@/components/projects/shared/icons";
import { ThemeBadge } from "@/components/projects/shared/theme-badge";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";
import { log } from "@/utils/logger";
import { FilePreviewCard } from "./file-preview-card";
import { LinkPreviewItem } from "./link-preview-item";

export function ApplicationPreview({
	connectionStatus,
	connectionStatusColor,
	parentId,
}: {
	connectionStatus?: string;
	connectionStatusColor?: string;
	parentId?: string;
}) {
	log.info("ApplicationPreview render", { parentId });
	const application = useApplicationStore((state) => state.application);

	const templateFiles: FileWithId[] = useMemo(
		() =>
			(application?.grant_template?.rag_sources ?? [])
				.filter((source) => source.filename)
				.map((source) => {
					const file = new File([], source.filename!, { type: "application/octet-stream" });
					return Object.assign(file, { id: source.sourceId });
				}),
		[application?.grant_template?.rag_sources],
	);

	const templateUrls = useMemo(
		() =>
			(application?.grant_template?.rag_sources ?? [])
				.filter((source) => source.url)
				.map((source) => source.url!),
		[application?.grant_template?.rag_sources],
	);

	const isEmpty = !application?.title && templateFiles.length === 0 && templateUrls.length === 0;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-app-gray-100 p-5 md:p-7">
			{isEmpty ? (
				<div className="flex h-full items-center justify-center">
					<IconPreviewLogo height={180} width={180} />
				</div>
			) : (
				<>
					<div className="mb-11 flex flex-col items-start gap-2">
						<div className="flex items-center gap-2">
							<ThemeBadge color="light" leftIcon={<IconApplication />}>
								Application Title
							</ThemeBadge>
							{connectionStatus && (
								<ThemeBadge className={`w-fit ${connectionStatusColor} text-white`}>
									{connectionStatus}
								</ThemeBadge>
							)}
						</div>
						<h3
							className={`font-heading text-3xl font-medium leading-[34px] ${application?.title ? "" : "text-muted-foreground-dark/50"}`}
							data-testid="application-title"
						>
							{application?.title ?? "Untitled Application"}
						</h3>
					</div>

					<div className="flex-1 overflow-y-auto">
						<div className="space-y-5">
							{templateFiles.length > 0 && (
								<AppCard
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-documents"
								>
									<h4 className="font-heading mb-8 text-base font-semibold leading-[22px]">
										Application Documents
									</h4>
									<div className="flex flex-wrap gap-3" data-testid="file-collection">
										{templateFiles.map((file, index) => (
											<FilePreviewCard
												file={file}
												key={file.name + index.toString()}
												parentId={parentId}
											/>
										))}
									</div>
								</AppCard>
							)}

							{templateUrls.length > 0 && (
								<AppCard
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-links"
								>
									<h4 className="font-heading mb-8 text-base font-semibold leading-[22px]">Links</h4>
									<div className="space-y-1">
										{templateUrls.map((url, index) => (
											<LinkPreviewItem
												key={url + index.toString()}
												parentId={parentId}
												url={url}
											/>
										))}
									</div>
								</AppCard>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	);
}