"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { FilePreviewCard, LinkPreviewItem } from "@/components/projects";
import { PreviewCard } from "@/components/wizard/preview-card";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";

const ANALYZING_STEPS = [
	{
		steps: [
			"Analyzing the documents to capture every needed section and requirement.",
			"Reviewing the guidelines in detail so no needed section is overlooked.",
		],
		title: "Reading the call",
	},
	{
		steps: [
			"Translating the requirements into a section-by-section framework.",
			"Drafting a template that mirrors the grant application guidelines.",
		],
		title: "Building the outline",
	},
	{
		steps: [
			"Attaching description for each section to focus the draft generation.",
			"Pairing every section with clear guidance on what it should include.",
		],
		title: "Adding writing cues",
	},
	{
		steps: [
			"Running a quick consistency scan to confirm coverage and flow.",
			"Verifying the outline for gaps or overlap before displaying it.",
		],
		title: "Final check",
	},
];

const getStepDelay = (stepIndex: number) => {
	return `${stepIndex * 100}ms`;
};

const shouldShowConnector = (sectionIndex: number) => {
	return sectionIndex < ANALYZING_STEPS.length - 1;
};

const getStepContainerClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "transition-all duration-700";
	const visibilityClasses = visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0";
	return `${baseClasses} ${visibilityClasses}`;
};

const getConnectorLineClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "absolute left-3 top-8 h-full w-0.5 transition-all duration-500";
	const colorClasses = visibleSteps > sectionIndex ? "bg-blue-200" : "bg-gray-200";
	return `${baseClasses} ${colorClasses}`;
};

const getStepNumberClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses =
		"flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300";
	const stateClasses =
		visibleSteps > sectionIndex
			? "border-blue-500 bg-blue-500 text-white"
			: "border-gray-300 bg-white text-gray-400";
	return `${baseClasses} ${stateClasses}`;
};

const getStepTitleClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "font-medium transition-colors duration-300";
	const colorClasses = visibleSteps > sectionIndex ? "text-gray-900" : "text-gray-400";
	return `${baseClasses} ${colorClasses}`;
};

const getStepContentClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "flex items-start gap-2 text-sm transition-all duration-300";
	const visibilityClasses = visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0";
	return `${baseClasses} ${visibilityClasses}`;
};

const getStepTextClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "transition-colors duration-300";
	const colorClasses = visibleSteps > sectionIndex ? "text-gray-700" : "text-gray-400";
	return `${baseClasses} ${colorClasses}`;
};

const isStepActive = (sectionIndex: number, visibleSteps: number) => {
	return visibleSteps === sectionIndex + 1;
};

export function ApplicationStructureFilePreview({
	parentId,
	templateFiles,
	templateUrls,
}: {
	parentId: string | undefined;
	templateFiles: FileWithSource[];
	templateUrls: UrlWithSource[];
}) {
	return (
		<div className="space-y-3">
			{templateFiles.length > 0 && <DocumentsCard parentId={parentId} templateFiles={templateFiles} />}
			{templateUrls.length > 0 && <LinksCard parentId={parentId} templateUrls={templateUrls} />}
		</div>
	);
}

export function ApplicationStructureLeftPane() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);

	const [visibleSteps, setVisibleSteps] = useState(0);
	const [isInfoBannerVisible, setIsInfoBannerVisible] = useState(true);

	const hasGrantSections = (grantTemplate?.grant_sections.length ?? 0) > 0;
	const shouldShowAnalyzing = isGeneratingTemplate || !hasGrantSections;

	const parentId = grantTemplate?.id;

	const templateFiles: FileWithSource[] = useMemo(
		() =>
			(grantTemplate?.rag_sources ?? [])
				.filter((source) => source.filename)
				.map((source) => {
					const file = new File([], source.filename!, { type: "application/octet-stream" });
					return Object.assign(file, {
						id: source.sourceId,
						sourceId: source.sourceId,
						sourceStatus: source.status,
					});
				}),
		[grantTemplate?.rag_sources],
	);

	const templateUrls: UrlWithSource[] = useMemo(
		() =>
			(grantTemplate?.rag_sources ?? [])
				.filter((source) => source.url)
				.map((source) => ({
					sourceId: source.sourceId,
					sourceStatus: source.status,
					url: source.url!,
				})),
		[grantTemplate?.rag_sources],
	);

	usePollingCleanup();

	useEffect(() => {
		if (shouldShowAnalyzing) {
			const interval = setInterval(() => {
				setVisibleSteps((prev) => {
					if (prev < ANALYZING_STEPS.length) {
						return prev + 1;
					}
					return prev;
				});
			}, 1000);

			return () => {
				clearInterval(interval);
			};
		}
		setVisibleSteps(0);
	}, [shouldShowAnalyzing]);

	return (
		<div className="w-1/2 md:w-1/3 lg:w-1/4 h-full flex flex-col" data-testid="application-structure-left-pane">
			<div className="flex-1 overflow-y-auto p-6">
				<div className="space-y-2">
					<div>
						<h2
							className="font-heading text-2xl font-medium leading-loose"
							data-testid="application-structure-header"
						>
							Application Structure
						</h2>

						{!shouldShowAnalyzing && (
							<p
								className="text-muted-foreground-dark leading-tight whitespace-pre-line"
								data-testid="application-structure-description"
							>
								Organize Your Application Structure. Drag and drop sections to reorder your application.
								{"\n"}You can also edit, remove, or add new sections as needed. Once everything looks
								good, click Approve and Continue.
							</p>
						)}
					</div>

					{!shouldShowAnalyzing && isInfoBannerVisible && (
						<div className="self-stretch p-2 bg-slate-100 rounded outline-1 outline-offset-[-1px] outline-slate-400 inline-flex justify-start items-start gap-1">
							<Image
								alt="Info"
								className="shrink-0"
								height={16}
								src="/icons/icon-toast-info.svg"
								width={16}
							/>
							<div className="flex-1 grow text-sm text-app-black font-normal leading-tight">
								Keep in mind that AI has limitations and may occasionally make mistakes. Always review
								and refine the output.
							</div>
							<button
								className="shrink-0 self-start"
								onClick={() => {
									setIsInfoBannerVisible(false);
								}}
								type="button"
							>
								<Image
									alt="Close"
									className="hover:opacity-60 transition-opacity cursor-pointer"
									height={16}
									src="/icons/close.svg"
									width={16}
								/>
							</button>
						</div>
					)}

					{shouldShowAnalyzing && (
						<div className="relative space-y-6 mt-6">
							{ANALYZING_STEPS.map((section, sectionIndex) => (
								<div
									className={getStepContainerClassName(sectionIndex, visibleSteps)}
									key={sectionIndex}
								>
									<div className="relative">
										{shouldShowConnector(sectionIndex) && (
											<div className={getConnectorLineClassName(sectionIndex, visibleSteps)} />
										)}

										<div className="mb-3 flex items-center gap-3">
											<div className={getStepNumberClassName(sectionIndex, visibleSteps)}>
												<span className="text-xs font-medium">{sectionIndex + 1}</span>
											</div>
											<h4
												className={getStepTitleClassName(sectionIndex, visibleSteps)}
												data-testid="analyzing-step-title"
											>
												{section.title}
											</h4>
											{isStepActive(sectionIndex, visibleSteps) && (
												<div
													className="ml-2 size-2 animate-pulse rounded-full bg-blue-500"
													data-testid="step-active-indicator"
												/>
											)}
										</div>

										<div className="ml-9 space-y-2">
											{section.steps.map((step, stepIndex) => (
												<div
													className={getStepContentClassName(sectionIndex, visibleSteps)}
													key={stepIndex}
													style={{
														transitionDelay: getStepDelay(stepIndex),
													}}
												>
													<span className="text-gray-400">{stepIndex + 1}.</span>
													<span className={getStepTextClassName(sectionIndex, visibleSteps)}>
														{step}
													</span>
												</div>
											))}
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{!shouldShowAnalyzing && (
						<div className="mt-6">
							<ApplicationStructureFilePreview
								parentId={parentId}
								templateFiles={templateFiles}
								templateUrls={templateUrls}
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function DocumentsCard({ parentId, templateFiles }: { parentId?: string; templateFiles: FileWithSource[] }) {
	return (
		<PreviewCard className="gap-5" data-testid="application-documents">
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
		<PreviewCard className="gap-5" data-testid="application-links">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Links</h4>
			<div className="space-y-1">
				{templateUrls.map((urlSource, index) => (
					<LinkPreviewItem
						key={urlSource.url + index.toString()}
						parentId={parentId}
						sourceStatus={urlSource.sourceStatus}
						url={urlSource.url}
					/>
				))}
			</div>
		</PreviewCard>
	);
}
