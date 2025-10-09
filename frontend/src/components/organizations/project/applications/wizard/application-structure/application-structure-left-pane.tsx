"use client";

import { useEffect, useMemo, useState } from "react";
import { FilePreviewCard } from "@/components/organizations/project/applications/wizard/file-preview-card";
import { LinkPreviewItem } from "@/components/organizations/project/applications/wizard/link-preview-item";
import { PreviewCard } from "@/components/organizations/project/applications/wizard/preview-card";
import { WizardBanner } from "@/components/organizations/project/applications/wizard/wizard-banner";
import { WizardLeftPane } from "@/components/organizations/project/applications/wizard/wizard-left-pane";
import { useApplicationStore } from "@/stores/application-store";
import { useWizardStore } from "@/stores/wizard-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";
import type { TemplateEvent } from "@/types/notification-events";

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

const getStepContainerClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "relative";
	const isVisible = visibleSteps > sectionIndex;
	const visibilityClasses = isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4";
	const zIndex = `z-[${40 - sectionIndex}]`;
	const transitionClasses = "transition-all duration-[2000ms] ease-[cubic-bezier(0.4,0,0.2,1)]";
	return `${baseClasses} ${visibilityClasses} ${zIndex} ${transitionClasses}`;
};

const getStepLineClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "w-[3px] flex-1 shrink-0 relative overflow-hidden transition-opacity duration-1000";

	const isVisible = visibleSteps > sectionIndex;
	const visibilityClasses = isVisible ? "opacity-100" : "opacity-0";

	const zIndex = `z-[${40 - sectionIndex}]`;

	return `${baseClasses} ${visibilityClasses} ${zIndex}`;
};

const getStepCircleClassName = (sectionIndex: number, visibleSteps: number) => {
	const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
	const baseClasses =
		"w-2 h-2 rounded-full border border-primary bg-transparent transition-all duration-1000 shrink-0";

	if (isLastStep) {
		return `${baseClasses} opacity-0 invisible`;
	}

	const threshold = sectionIndex + 1;
	const shouldShowCircle = visibleSteps > threshold;
	const visibilityClasses = shouldShowCircle ? "opacity-100" : "opacity-0";

	return `${baseClasses} ${visibilityClasses}`;
};

const getStepTitleClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "font-medium transition-colors duration-1000";
	const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
	const threshold = sectionIndex + 1;

	const shouldBeBlack = isLastStep ? visibleSteps >= threshold + 1 : visibleSteps > threshold;

	const colorClasses = shouldBeBlack ? "text-app-black" : "text-app-gray-500";

	return `${baseClasses} ${colorClasses}`;
};

const getStepContentClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "flex items-start gap-2 text-sm transition-all duration-1000";
	const visibilityClasses = visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0";
	return `${baseClasses} ${visibilityClasses}`;
};

const getStepTextClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "transition-colors duration-1000";
	const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
	const threshold = sectionIndex + 1;

	const shouldBeBlack = isLastStep ? visibleSteps >= threshold + 1 : visibleSteps > threshold;

	const colorClasses = shouldBeBlack ? "text-app-black" : "text-app-gray-500";

	return `${baseClasses} ${colorClasses}`;
};

const eventToVisualStepMap: Record<TemplateEvent, number> = {
	cfp_data_extracted: 2,
	grant_template_created: 4,
	indexing_failed: -1,
	indexing_timeout: -1,
	insufficient_context_error: -1,
	internal_error: -1,
	job_cancelled: -1,
	llm_timeout: -1,
	metadata_generated: 3,
	pipeline_error: -1,
};

export function ApplicationStructureLeftPane() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);

	const [isInfoBannerVisible, setIsInfoBannerVisible] = useState(true);

	const hasGrantSections = (grantTemplate?.grant_sections.length ?? 0) > 0;
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

	if (!hasGrantSections) {
		return (
			<WizardLeftPane
				contentSpacing="space-y-2"
				innerClassName="h-full flex flex-col"
				testId="application-structure-left-pane"
			>
				<TitleHeader showDescription={false} />
				<AnalyzingSteps />
			</WizardLeftPane>
		);
	}

	return (
		<WizardLeftPane contentSpacing="space-y-2" testId="application-structure-left-pane">
			<TitleHeader showDescription={true} />

			{isInfoBannerVisible && (
				<WizardBanner
					onClose={() => {
						setIsInfoBannerVisible(false);
					}}
					variant="info"
				>
					Keep in mind that AI has limitations and may occasionally make mistakes. Always review and refine
					the output.
				</WizardBanner>
			)}

			<div className="mt-2 2xl:mt-6">
				<ApplicationStructureSourcesPreview
					parentId={parentId}
					templateFiles={templateFiles}
					templateUrls={templateUrls}
				/>
			</div>
		</WizardLeftPane>
	);
}

export function ApplicationStructureSourcesPreview({
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

function AnalyzingSteps() {
	const templateEvent = useWizardStore((state) => state.templateEvent);
	const templateGenerationErrorMessage = useWizardStore((state) => state.templateGenerationErrorMessage);
	const isGeneratingTemplate = useWizardStore((state) => state.isGeneratingTemplate);
	const [maxVisibleSteps, setMaxVisibleSteps] = useState(0);
	const [showStepsDetails, setShowStepsDetails] = useState(false);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		if (isGeneratingTemplate && maxVisibleSteps === 0) {
			setMaxVisibleSteps(2);
			setShowStepsDetails(true);
		}
	}, [isGeneratingTemplate, maxVisibleSteps]);

	useEffect(() => {
		if (templateEvent) {
			const stepGroup = eventToVisualStepMap[templateEvent];

			if (stepGroup === -1) {
				setHasError(true);
				return;
			}
			setHasError(false);
			setShowStepsDetails(true);

			if (stepGroup >= 0) {
				const newVisibleSteps = stepGroup + 1;
				setMaxVisibleSteps((prev) => Math.max(prev, newVisibleSteps));
			}
		}
	}, [templateEvent]);

	if (hasError && templateEvent) {
		return (
			<div className="relative space-y-6 mt-6">
				<div className="rounded-lg border border-red-200 bg-red-50 p-4">
					<div className="flex items-start gap-3">
						<div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-red-500">
							<span className="text-xs font-medium text-white">!</span>
						</div>
						<div className="flex-1">
							<h4 className="font-medium text-red-900" data-testid="error-title">
								Template Generation Failed
							</h4>
							<p className="mt-1 text-sm text-red-700" data-testid="error-message">
								{templateGenerationErrorMessage ?? "Template generation failed. Please try again."}
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col flex-1">
			{ANALYZING_STEPS.map((section, sectionIndex) => (
				<div
					className={`flex-1 ${getStepContainerClassName(sectionIndex, maxVisibleSteps)}`}
					key={sectionIndex}
				>
					<div className="flex gap-3 h-full">
						<div className="flex flex-col items-center h-full relative">
							<div className={getStepLineClassName(sectionIndex, maxVisibleSteps)}>
								<div className="absolute inset-0 bg-gradient-to-b from-[#4A4855] to-[#A39EBB] transition-opacity duration-1000" />
								<div
									className={`absolute inset-0 bg-primary transition-opacity duration-1000 ${(() => {
										const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
										const threshold = sectionIndex + 1;
										const shouldBeBlack = isLastStep
											? maxVisibleSteps >= threshold + 1
											: maxVisibleSteps > threshold;
										return shouldBeBlack ? "opacity-100" : "opacity-0";
									})()}`}
								/>
							</div>
							<div className={getStepCircleClassName(sectionIndex, maxVisibleSteps)} />
						</div>
						<div className="flex-1">
							<h4
								className={getStepTitleClassName(sectionIndex, maxVisibleSteps)}
								data-testid="analyzing-step-title"
							>
								{section.title}
							</h4>

							{showStepsDetails && (
								<div className="mt-3 space-y-2">
									{section.steps.map((step, stepIndex) => (
										<div
											className={getStepContentClassName(sectionIndex, maxVisibleSteps)}
											key={stepIndex}
											style={{
												transitionDelay: getStepDelay(stepIndex),
											}}
										>
											<span className="text-gray-400">{stepIndex + 1}.</span>
											<span className={getStepTextClassName(sectionIndex, maxVisibleSteps)}>
												{step}
											</span>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function DocumentsCard({ parentId, templateFiles }: { parentId?: string; templateFiles: FileWithSource[] }) {
	return (
		<PreviewCard className="gap-2 2xl:gap-5" data-testid="application-documents">
			<h4 className="font-heading text-base font-semibold leading-snug text-stone-900">Application Documents</h4>
			<div className="flex flex-wrap gap-3" data-testid="file-collection">
				{templateFiles.map((file, index) => (
					<FilePreviewCard
						disableRemove={true}
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
						disableRemove={true}
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

function TitleHeader({ showDescription }: { showDescription: boolean }) {
	return (
		<div>
			<h2 className="font-heading text-2xl font-medium leading-loose" data-testid="application-structure-header">
				Application Structure
			</h2>

			{showDescription && (
				<p
					className="text-muted-foreground-dark leading-tight whitespace-pre-line"
					data-testid="application-structure-description"
				>
					Organize Your Application Structure. Drag and drop sections to reorder your application.
					{"\n"}You can also edit, remove, or add new sections as needed. Once everything looks good, click
					Approve and Continue.
				</p>
			)}
		</div>
	);
}
