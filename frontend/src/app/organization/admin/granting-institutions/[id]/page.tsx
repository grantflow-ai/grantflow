"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { FilePreviewCard } from "@/components/organizations/project/applications/wizard/file-preview-card";
import { LinkPreviewItem } from "@/components/organizations/project/applications/wizard/link-preview-item";
import { PendingFilePreviewCard } from "@/components/organizations/project/applications/wizard/pending-file-preview-card";
import { PreviewCard } from "@/components/organizations/project/applications/wizard/preview-card";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { WizardRightPane } from "@/components/organizations/project/applications/wizard/wizard-right-pane";
import { RagSourceFileUploader } from "@/components/shared/rag-source-file-uploader";
import { RagSourceUrlInput } from "@/components/shared/rag-source-url-input";
import { Button } from "@/components/ui/button";
import { EmptyStatePreview } from "@/components/ui/empty-state-preview";
import { Separator } from "@/components/ui/separator";
import { SourceIndexingStatus } from "@/enums";
import { useGrantingInstitutionStore } from "@/stores/granting-institution-store";
import type { FileWithId, FileWithSource, UrlWithSource } from "@/types/files";
import { routes } from "@/utils/navigation";
import { AdminFooter } from "@/components/admin/admin-footer";

export default function GrantingInstitutionDetailPage() {
	const params = useParams();
	const id = params.id as string;

	const {
		addFile,
		addUrl,
		deleteSource,
		institution,
		isLoading,
		loadData,
		pendingUploads,
		removePendingUpload,
		reset,
		setInstitutionId,
		sources,
	} = useGrantingInstitutionStore();

	// Initialize store with institution ID
	useEffect(() => {
		if (id) {
			setInstitutionId(id);
			void loadData();
		}

		return () => {
			reset();
		};
	}, [id, setInstitutionId, loadData, reset]);

	// Poll for source status updates when there are indexing sources
	useEffect(() => {
		const hasIndexingSources = sources.some(
			(source) =>
				(source.indexing_status as SourceIndexingStatus) === SourceIndexingStatus.CREATED ||
				(source.indexing_status as SourceIndexingStatus) === SourceIndexingStatus.INDEXING,
		);

		if (!hasIndexingSources) {
			return;
		}

		const pollInterval = setInterval(() => {
			void loadData();
		}, 3000); // Poll every 3 seconds

		return () => {
			clearInterval(pollInterval);
		};
	}, [sources, loadData]);

	const handleFileAdd = async (file: FileWithId) => {
		await addFile(file);
	};

	const handleUrlAdd = async (url: string) => {
		await addUrl(url);
	};

	const handleDeleteSource = async (sourceId: string) => {
		await deleteSource(sourceId);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-screen bg-preview-bg">
				<div className="flex flex-col items-center gap-4">
					<div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
					<p className="text-app-gray-600">Loading granting institution...</p>
				</div>
			</div>
		);
	}

	if (!institution) {
		return (
			<div className="flex items-center justify-center h-screen bg-preview-bg">
				<p className="text-app-gray-600">Granting institution not found</p>
			</div>
		);
	}

	const files: FileWithSource[] = sources
		.filter((source): source is Extract<typeof source, { filename: string }> => "filename" in source)
		.map((source) => {
			const file = new File([], source.filename, { type: source.mime_type });
			return Object.assign(file, {
				id: source.id,
				sourceId: source.id,
				sourceStatus: source.indexing_status,
			});
		});

	const urls: UrlWithSource[] = sources
		.filter((source): source is Extract<typeof source, { url: string }> => "url" in source)
		.map((source) => ({
			sourceId: source.id,
			sourceStatus: source.indexing_status,
			url: source.url,
		}));

	const existingUrls = urls.map((u) => u.url);
	const pendingUploadsArray = [...pendingUploads];
	const hasFilesOrUrls = files.length > 0 || urls.length > 0 || pendingUploadsArray.length > 0;
	const hasBothFilesAndUrls = (files.length > 0 || pendingUploadsArray.length > 0) && urls.length > 0;

	return (
		<div className="flex flex-col h-full">
			<div className="border-b border-app-gray-100 bg-white px-6 py-4 flex-shrink-0">
				<Link href={routes.admin.grantingInstitutions.list()}>
					<Button className="mb-2" size="sm" variant="ghost">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to list
					</Button>
				</Link>
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-app-black">{institution.full_name}</h1>
						{institution.abbreviation && (
							<p className="text-sm text-app-gray-700">{institution.abbreviation}</p>
						)}
					</div>
					<Link href={routes.admin.grantingInstitutions.edit(id)}>
						<Button
							className="border-primary text-primary hover:bg-primary hover:text-white"
							size="sm"
							variant="outline"
						>
							<Pencil className="mr-2 h-4 w-4" />
							Edit Details
						</Button>
					</Link>
				</div>
			</div>

			<div className="flex flex-1 overflow-hidden">
				<WizardLeftPane testId="granting-institution-left-pane">
					<div>
						<h2 className="font-heading text-2xl font-medium leading-loose">Source Materials</h2>
						<p className="text-muted-foreground-dark leading-tight">
							Upload documents and add URLs for this granting institution to build knowledge base for
							grant template analysis and generation.
						</p>
					</div>

					<div className="space-y-6">
						<div>
							<h3 className="font-heading mb-5 text-base font-semibold leading-snug">Documents</h3>
							<RagSourceFileUploader
								onFileAdd={handleFileAdd}
								onFileRemove={removePendingUpload}
								testId="granting-institution-file-upload"
							/>
						</div>

						<div>
							<h3 className="font-heading text-base font-semibold leading-snug">Links</h3>
							<p className="text-muted-foreground-dark mb-5 text-sm leading-none">
								Use a static link that doesn&apos;t require login, so we can retrieve the information.
							</p>

							<RagSourceUrlInput
								existingUrls={existingUrls}
								onUrlAdd={handleUrlAdd}
								testId="granting-institution-url-input"
							/>
						</div>
					</div>
				</WizardLeftPane>

				{hasFilesOrUrls ? (
					<WizardRightPane padding="p-6 md:p-4" testId="granting-institution-right-pane">
						<div className="flex-1 min-h-0 overflow-y-auto h-full">
							<div className="space-y-5">
								<PreviewCard data-testid="granting-institution-sources-container">
									{(files.length > 0 || pendingUploadsArray.length > 0) && (
										<>
											<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">
												Documents
											</h4>
											<div
												className="flex flex-wrap gap-3"
												data-testid="granting-institution-files"
											>
												{files.map((file, index) => (
													<FilePreviewCard
														file={file}
														key={file.name + index.toString()}
														onDelete={() => {
															void handleDeleteSource(file.sourceId);
														}}
														parentId={id}
														sourceStatus={file.sourceStatus}
													/>
												))}
												{pendingUploadsArray.map((file) => (
													<PendingFilePreviewCard file={file} key={`pending-${file.id}`} />
												))}
											</div>
										</>
									)}

									{hasBothFilesAndUrls && (
										<Separator
											className="bg-gray-200"
											data-testid="granting-institution-separator"
										/>
									)}

									{urls.length > 0 && (
										<>
											<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">
												Links
											</h4>
											<div
												className="grid grid-cols-2 gap-x-11"
												data-testid="granting-institution-urls"
											>
												<div className="space-y-1">
													{urls
														.filter((_, index) => index % 2 === 0)
														.map((urlSource, index) => (
															<LinkPreviewItem
																key={urlSource.url + index.toString()}
																onDelete={() => {
																	void handleDeleteSource(urlSource.sourceId);
																}}
																parentId={id}
																sourceStatus={urlSource.sourceStatus}
																url={urlSource.url}
															/>
														))}
												</div>
												<div className="space-y-1">
													{urls
														.filter((_, index) => index % 2 === 1)
														.map((urlSource, index) => (
															<LinkPreviewItem
																key={urlSource.url + index.toString()}
																onDelete={() => {
																	void handleDeleteSource(urlSource.sourceId);
																}}
																parentId={id}
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
				) : (
					<WizardRightPane testId="granting-institution-right-pane">
						<EmptyStatePreview />
					</WizardRightPane>
				)}
			</div>
				<AdminFooter />
		</div>
	);
}
