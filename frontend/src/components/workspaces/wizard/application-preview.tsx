"use client";

import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconApplication, IconPreviewLogo } from "@/components/workspaces/icons";
import { ThemeBadge } from "@/components/workspaces/theme-badge";
import FilePreviewCard from "@/components/workspaces/wizard/file-preview-card";
import LinkPreviewItem from "@/components/workspaces/wizard/link-preview-item";
import { useApplicationStore } from "@/stores/application-store";
import type { FileWithId } from "@/types/files";

export function ApplicationPreview({
	connectionStatus,
	connectionStatusColor,
	parentId,
}: {
	connectionStatus?: string;
	connectionStatusColor?: string;
	parentId?: string;
}) {
	const { application } = useApplicationStore();

	const templateFiles: FileWithId[] = (application?.grant_template?.rag_sources ?? [])
		.filter((source) => source.filename)
		.map((source) => {
			const file = new File([], source.filename!, { type: "application/octet-stream" });
			return Object.assign(file, { id: source.sourceId });
		});

	const templateUrls = (application?.grant_template?.rag_sources ?? [])
		.filter((source) => source.url)
		.map((source) => source.url!);

	const isEmpty = !application?.title && templateFiles.length === 0 && templateUrls.length === 0;

	return (
		<div className="bg-preview-bg flex h-full w-[70%] flex-col gap-6 border-l border-gray-100 p-5 md:p-7">
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
							className={`font-heading text-center text-3xl font-medium ${application?.title ? "" : "text-muted-foreground-dark/50"}`}
							data-testid="application-title"
						>
							{application?.title ?? "Untitled Application"}
						</h3>
					</div>

					<ScrollArea className="flex-1">
						<div className="space-y-5">
							{templateFiles.length > 0 && (
								<Card
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-documents"
								>
									<h4 className="font-heading mb-8 font-semibold">Application Documents</h4>
									<div className="flex gap-3" data-testid="file-collection">
										{templateFiles.map((file, index) => (
											<FilePreviewCard
												file={file}
												key={file.name + index.toString()}
												parentId={parentId}
											/>
										))}
									</div>
								</Card>
							)}

							{templateUrls.length > 0 && (
								<Card
									className="border-app-gray-100 border p-5 shadow-none"
									data-testid="application-links"
								>
									<h4 className="font-heading mb-8 font-semibold">Links</h4>
									<div className="space-y-1">
										{templateUrls.map((url, index) => (
											<LinkPreviewItem
												key={url + index.toString()}
												parentId={parentId}
												url={url}
											/>
										))}
									</div>
								</Card>
							)}
						</div>
					</ScrollArea>
				</>
			)}
		</div>
	);
}
