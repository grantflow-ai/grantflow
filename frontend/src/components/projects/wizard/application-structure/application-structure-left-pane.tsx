"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppCard } from "@/components/app";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithId } from "@/types/files";
import { FilePreviewCard } from "../shared/file-preview-card";
import { LinkPreviewItem } from "../shared/link-preview-item";

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

export function ApplicationStructureFilePreview({
	hasTemplateFiles,
	hasTemplateUrls,
	parentId,
	templateFiles,
	templateUrls,
}: {
	hasTemplateFiles: boolean;
	hasTemplateUrls: boolean;
	parentId: string | undefined;
	templateFiles: FileWithId[];
	templateUrls: string[];
}) {
	return (
		<div className="space-y-4">
			<AppCard className="border-app-gray-100 border p-4 shadow-none" data-testid="application-documents-card">
				<h3 className="font-heading mb-2 text-base font-semibold" data-testid="application-documents-title">
					Application Documents
				</h3>
				{hasTemplateFiles ? (
					<div className="flex gap-3">
						{templateFiles.map((file, index) => (
							<FilePreviewCard file={file} key={file.name + index.toString()} parentId={parentId} />
						))}
					</div>
				) : (
					<p className="text-muted-foreground-dark text-sm" data-testid="no-documents-message">
						No documents uploaded yet.
					</p>
				)}
			</AppCard>

			{hasTemplateUrls && (
				<AppCard className="border-app-gray-100 border p-4 shadow-none">
					<h3 className="font-heading mb-2 text-base font-semibold" data-testid="template-links-title">
						Links
					</h3>
					<div className="space-y-1">
						{templateUrls.map((url, index) => (
							<LinkPreviewItem key={url + index.toString()} parentId={parentId} url={url} />
						))}
					</div>
				</AppCard>
			)}
		</div>
	);
}

export function ApplicationStructureLeftPane() {
	const application = useApplicationStore((state) => state.application);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);

	const [visibleSteps, setVisibleSteps] = useState(0);

	const parentId = application?.grant_template?.id;

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

	usePollingCleanup();

	useEffect(() => {
		if (isGeneratingTemplate) {
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
	}, [isGeneratingTemplate]);

	const getStepContainerClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses = "transition-all duration-700";
			const visibilityClasses =
				visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-4 opacity-0";
			return `${baseClasses} ${visibilityClasses}`;
		},
		[visibleSteps],
	);

	const getConnectorLineClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses = "absolute left-3 top-8 h-full w-0.5 transition-all duration-500";
			const colorClasses = visibleSteps > sectionIndex ? "bg-blue-200" : "bg-gray-200";
			return `${baseClasses} ${colorClasses}`;
		},
		[visibleSteps],
	);

	const getStepNumberClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses =
				"flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300";
			const stateClasses =
				visibleSteps > sectionIndex
					? "border-blue-500 bg-blue-500 text-white"
					: "border-gray-300 bg-white text-gray-400";
			return `${baseClasses} ${stateClasses}`;
		},
		[visibleSteps],
	);

	const getStepTitleClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses = "font-medium transition-colors duration-300";
			const colorClasses = visibleSteps > sectionIndex ? "text-gray-900" : "text-gray-400";
			return `${baseClasses} ${colorClasses}`;
		},
		[visibleSteps],
	);

	const getStepContentClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses = "flex items-start gap-2 text-sm transition-all duration-300";
			const visibilityClasses =
				visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0";
			return `${baseClasses} ${visibilityClasses}`;
		},
		[visibleSteps],
	);

	const getStepTextClassName = useCallback(
		(sectionIndex: number) => {
			const baseClasses = "transition-colors duration-300";
			const colorClasses = visibleSteps > sectionIndex ? "text-gray-700" : "text-gray-400";
			return `${baseClasses} ${colorClasses}`;
		},
		[visibleSteps],
	);

	const isStepActive = useCallback(
		(sectionIndex: number) => {
			return visibleSteps === sectionIndex + 1;
		},
		[visibleSteps],
	);

	const shouldShowConnector = useCallback((sectionIndex: number) => {
		return sectionIndex < ANALYZING_STEPS.length - 1;
	}, []);

	const getStepDelay = useCallback((stepIndex: number) => {
		return `${stepIndex * 100}ms`;
	}, []);

	const descriptionText = useMemo(() => {
		return isGeneratingTemplate
			? "Analyzing your knowledge base to generate the optimal structure..."
			: "Organize Your Application Structure. Drag and drop sections to reorder your application.\nYou can also edit, remove, or add new sections as needed. Once everything looks good, click Approve and Continue.";
	}, [isGeneratingTemplate]);

	const hasTemplateFiles = useMemo(() => templateFiles.length > 0, [templateFiles.length]);
	const hasTemplateUrls = useMemo(() => templateUrls.length > 0, [templateUrls.length]);

	return (
		<div className="w-1/3 overflow-y-auto p-6 sm:w-1/2">
			<div className="space-y-6">
				<div>
					<h2
						className="font-heading text-2xl font-medium leading-loose"
						data-testid="application-structure-header"
					>
						Application Structure
					</h2>
					<p
						className="text-muted-foreground-dark leading-tight whitespace-pre-line"
						data-testid="application-structure-description"
					>
						{descriptionText}
					</p>
				</div>

				{}
				<div className="bg-blue-50 border-blue-200 text-blue-700 flex gap-3 rounded-lg border p-4">
					<div className="bg-blue-100 text-blue-600 flex size-6 shrink-0 items-center justify-center rounded-full">
						<svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								clipRule="evenodd"
								d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
								fillRule="evenodd"
							/>
						</svg>
					</div>
					<div className="text-sm">
						<p>
							Keep in mind that AI has limitations and may occasionally make mistakes. Always review and
							refine the output.
						</p>
					</div>
					<button className="text-blue-400 hover:text-blue-600 ml-auto shrink-0" type="button">
						<svg className="size-4" fill="currentColor" viewBox="0 0 20 20">
							<path
								clipRule="evenodd"
								d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
								fillRule="evenodd"
							/>
						</svg>
					</button>
				</div>

				{isGeneratingTemplate ? (
					<div className="relative space-y-6">
						{ANALYZING_STEPS.map((section, sectionIndex) => (
							<div className={getStepContainerClassName(sectionIndex)} key={sectionIndex}>
								<div className="relative">
									{shouldShowConnector(sectionIndex) && (
										<div className={getConnectorLineClassName(sectionIndex)} />
									)}

									<div className="mb-3 flex items-center gap-3">
										<div className={getStepNumberClassName(sectionIndex)}>
											<span className="text-xs font-medium">{sectionIndex + 1}</span>
										</div>
										<h4
											className={getStepTitleClassName(sectionIndex)}
											data-testid="analyzing-step-title"
										>
											{section.title}
										</h4>
										{isStepActive(sectionIndex) && (
											<div
												className="ml-2 size-2 animate-pulse rounded-full bg-blue-500"
												data-testid="step-active-indicator"
											/>
										)}
									</div>

									<div className="ml-9 space-y-2">
										{section.steps.map((step, stepIndex) => (
											<div
												className={getStepContentClassName(sectionIndex)}
												key={stepIndex}
												style={{
													transitionDelay: getStepDelay(stepIndex),
												}}
											>
												<span className="text-gray-400">{stepIndex + 1}.</span>
												<span className={getStepTextClassName(sectionIndex)}>{step}</span>
											</div>
										))}
									</div>
								</div>
							</div>
						))}
					</div>
				) : (
					<ApplicationStructureFilePreview
						hasTemplateFiles={hasTemplateFiles}
						hasTemplateUrls={hasTemplateUrls}
						parentId={parentId}
						templateFiles={templateFiles}
						templateUrls={templateUrls}
					/>
				)}
			</div>
		</div>
	);
}
