"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useApplicationStore } from "@/stores/application-store";
import { type TemplateGenerationEvent, useWizardStore } from "@/stores/wizard-store";
import type { FileWithSource, UrlWithSource } from "@/types/files";
import { log } from "@/utils/logger";
import { FilePreviewCard, LinkPreviewItem, PreviewCard, WizardLeftPane } from "../shared";

// DEV_MODE: Remove before production - Development panel for testing websocket events
function DevEventSimulationPanel() {
	const [selectedEvent, setSelectedEvent] = useState<TemplateGenerationEvent>("grant_template_generation_started");
	const [customMessage, setCustomMessage] = useState("Starting generation");
	const [eventHistory, setEventHistory] = useState<
		{ event: TemplateGenerationEvent; message: string; timestamp: string }[]
	>([]);

	const allEvents: TemplateGenerationEvent[] = [
		"grant_template_generation_started",
		"indexing_in_progress",
		"extracting_cfp_data",
		"cfp_data_extracted",
		"grant_template_extraction",
		"sections_extracted",
		"grant_template_metadata",
		"metadata_generated",
		"saving_grant_template",
		"grant_template_created",
		"generation_error",
		"internal_error",
		"insufficient_context_error",
		"low_retrieval_quality",
		"pipeline_error",
	];

	const fireEvent = (event: TemplateGenerationEvent, message: string) => {
		useWizardStore.setState({
			templateGenerationStatus: { event, message },
		});

		setEventHistory((prev) => [
			...prev,
			{
				event,
				message,
				timestamp: new Date().toLocaleTimeString(),
			},
		]);
	};

	const clearStatus = () => {
		useWizardStore.setState({
			templateGenerationStatus: undefined,
		});
		setEventHistory([]);
	};

	const resetSteps = () => {
		// Clear the template generation status to reset the AnalyzingSteps component
		useWizardStore.setState({
			templateGenerationStatus: undefined,
		});
		setEventHistory([]);

		// Force a re-render by briefly setting a null status
		setTimeout(() => {
			useWizardStore.setState({
				templateGenerationStatus: null,
			});
		}, 50);
	};

	const runHappyPath = () => {
		clearStatus();
		const sequence = [
			{
				delay: 100,
				event: "grant_template_generation_started" as TemplateGenerationEvent,
				message: "🚀 Starting template generation process",
			},
			{
				delay: 1200,
				event: "indexing_in_progress" as TemplateGenerationEvent,
				message: "📄 Indexing uploaded documents",
			},
			{
				delay: 2400,
				event: "extracting_cfp_data" as TemplateGenerationEvent,
				message: "🔍 Extracting call for proposals data",
			},
			{
				delay: 3600,
				event: "sections_extracted" as TemplateGenerationEvent,
				message: "📝 Sections extracted from guidelines",
			},
			{
				delay: 4800,
				event: "metadata_generated" as TemplateGenerationEvent,
				message: "🏷️ Generated section metadata and descriptions",
			},
			{
				delay: 6000,
				event: "grant_template_created" as TemplateGenerationEvent,
				message: "✅ Template created successfully!",
			},
		];

		sequence.forEach(({ delay, event, message }) => {
			setTimeout(() => {
				fireEvent(event, message);
			}, delay);
		});
	};

	const runErrorScenario = () => {
		clearStatus();
		const sequence = [
			{
				delay: 100,
				event: "grant_template_generation_started" as TemplateGenerationEvent,
				message: "Starting template generation",
			},
			{ delay: 1200, event: "indexing_in_progress" as TemplateGenerationEvent, message: "Indexing documents" },
			{
				delay: 2400,
				event: "generation_error" as TemplateGenerationEvent,
				message: "❌ Failed to generate template: Insufficient document quality",
			},
		];

		sequence.forEach(({ delay, event, message }) => {
			setTimeout(() => {
				fireEvent(event, message);
			}, delay);
		});
	};

	return (
		<div className="fixed bottom-4 right-4 bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg z-50 w-80 max-h-96 overflow-y-auto">
			<div className="flex items-center justify-between mb-3">
				<h3 className="font-semibold text-sm text-blue-700">🚧 Dev Event Simulator</h3>
				<div className="flex gap-1">
					<span className="text-xs text-gray-500">Ctrl+Shift+D</span>
					<button
						className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
						onClick={clearStatus}
						type="button"
					>
						Clear
					</button>
				</div>
			</div>

			<div className="space-y-3">
				<div>
					<label className="block text-xs font-medium text-gray-700 mb-1">Event Type:</label>
					<select
						className="w-full text-xs border rounded px-2 py-1"
						onChange={(e) => {
							setSelectedEvent(e.target.value as TemplateGenerationEvent);
						}}
						value={selectedEvent}
					>
						{allEvents.map((event) => (
							<option key={event} value={event}>
								{event}
							</option>
						))}
					</select>
				</div>

				{/* Message Input */}
				<div>
					<label className="block text-xs font-medium text-gray-700 mb-1">Message:</label>
					<input
						className="w-full text-xs border rounded px-2 py-1"
						onChange={(e) => {
							setCustomMessage(e.target.value);
						}}
						placeholder="Custom message"
						type="text"
						value={customMessage}
					/>
				</div>

				{/* Action Buttons */}
				<div className="space-y-2">
					<div className="grid grid-cols-2 gap-2">
						<button
							className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
							onClick={() => {
								fireEvent(selectedEvent, customMessage);
							}}
							type="button"
						>
							Fire Event
						</button>
						<button
							className="text-xs bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
							onClick={runHappyPath}
							type="button"
						>
							Happy Path
						</button>
						<button
							className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
							onClick={runErrorScenario}
							type="button"
						>
							Error Flow
						</button>
						<button
							className="text-xs bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
							onClick={() => {
								fireEvent("indexing_in_progress", "📄 Indexing documents...");
							}}
							type="button"
						>
							Indexing
						</button>
					</div>
					<button
						className="w-full text-xs bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
						onClick={resetSteps}
						type="button"
					>
						🔄 Reset Steps
					</button>
				</div>

				{/* Event History */}
				{eventHistory.length > 0 && (
					<div>
						<h4 className="text-xs font-medium text-gray-700 mb-1">Recent Events:</h4>
						<div className="space-y-1 max-h-24 overflow-y-auto">
							{eventHistory.slice(-3).map((item, index) => (
								<div className="text-xs bg-gray-50 p-1 rounded" key={index}>
									<div className="font-mono text-gray-600">{item.timestamp}</div>
									<div className="font-medium">{item.event}</div>
									<div className="text-gray-600">{item.message}</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

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
			: "border-gray-300 bg-white text-app-gray-500";
	return `${baseClasses} ${stateClasses}`;
};

const getStepTitleClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "font-medium transition-colors duration-300";
	const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
	const threshold = sectionIndex + 1;

	const shouldBeBlack = isLastStep ? visibleSteps >= threshold + 1 : visibleSteps > threshold;

	const colorClasses = shouldBeBlack ? "text-app-black" : "text-app-gray-500";

	log.info("[getStepTitleClassName] Color class calculation", {
		colorClasses,
		finalClassName: `${baseClasses} ${colorClasses}`,
		isLastStep,
		sectionIndex,
		shouldBeBlack,
		threshold,
		visibleSteps,
	});

	return `${baseClasses} ${colorClasses}`;
};

const getStepContentClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "flex items-start gap-2 text-sm transition-all duration-300";
	const visibilityClasses = visibleSteps > sectionIndex ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0";
	return `${baseClasses} ${visibilityClasses}`;
};

const getStepTextClassName = (sectionIndex: number, visibleSteps: number) => {
	const baseClasses = "transition-colors duration-300";
	const isLastStep = sectionIndex === ANALYZING_STEPS.length - 1;
	const threshold = sectionIndex + 1;

	const shouldBeBlack = isLastStep ? visibleSteps >= threshold + 1 : visibleSteps > threshold;

	const colorClasses = shouldBeBlack ? "text-app-black" : "text-app-gray-500";

	log.info("[getStepTextClassName] Color class calculation", {
		colorClasses,
		finalClassName: `${baseClasses} ${colorClasses}`,
		isLastStep,
		sectionIndex,
		shouldBeBlack,
		threshold,
		visibleSteps,
	});

	return `${baseClasses} ${colorClasses}`;
};

const isStepActive = (sectionIndex: number, visibleSteps: number) => {
	return visibleSteps === sectionIndex + 1;
};

const eventToVisualStepMap: Record<TemplateGenerationEvent, number> = {
	cfp_data_extracted: 0,
	extracting_cfp_data: 0,
	generation_error: -1,

	grant_template_created: 4,
	grant_template_extraction: 1,

	grant_template_generation_started: 0,
	grant_template_metadata: 2,

	indexing_in_progress: 0,

	insufficient_context_error: -1,
	internal_error: -1,

	low_retrieval_quality: -1,
	metadata_generated: 2,
	pipeline_error: -1,
	saving_grant_template: 3,
	sections_extracted: 1,
};

export function ApplicationStructureLeftPane() {
	const grantTemplate = useApplicationStore((state) => state.application?.grant_template);

	const [isInfoBannerVisible, setIsInfoBannerVisible] = useState(true);

	// DEV_MODE: Remove before production - Feature flag for dev panel
	const [showDevPanel, setShowDevPanel] = useState(() => {
		if (typeof globalThis.window !== "undefined") {
			return localStorage.getItem("devEventSimulator") === "true";
		}
		return false;
	});

	// DEV_MODE: Remove before production - Toggle dev panel with keyboard shortcut
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.shiftKey && e.key === "D") {
				e.preventDefault();
				setShowDevPanel((prev) => {
					const newValue = !prev;
					localStorage.setItem("devEventSimulator", newValue.toString());
					return newValue;
				});
			}
		};

		globalThis.addEventListener("keydown", handleKeyDown);
		return () => {
			globalThis.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	// const hasGrantSections = (grantTemplate?.grant_sections.length ?? 0) > 0;
	const hasGrantSections = false;
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

	if (!hasGrantSections) {
		return (
			<>
				<WizardLeftPane contentSpacing="space-y-2" testId="application-structure-left-pane">
					<TitleHeader showDescription={false} />
					<AnalyzingSteps />
				</WizardLeftPane>
				{/* DEV_MODE: Remove before production */}
				{showDevPanel && <DevEventSimulationPanel />}
			</>
		);
	}

	return (
		<>
			<WizardLeftPane contentSpacing="space-y-2" testId="application-structure-left-pane">
				<TitleHeader showDescription={true} />

				{isInfoBannerVisible && (
					<InfoBanner
						onClose={() => {
							setIsInfoBannerVisible(false);
						}}
					/>
				)}

				<div className="mt-6">
					<ApplicationStructureSourcesPreview
						parentId={parentId}
						templateFiles={templateFiles}
						templateUrls={templateUrls}
					/>
				</div>
			</WizardLeftPane>
			{/* DEV_MODE: Remove before production */}
			{showDevPanel && <DevEventSimulationPanel />}
		</>
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
	const templateGenerationStatus = useWizardStore((state) => state.templateGenerationStatus);
	const [maxVisibleSteps, setMaxVisibleSteps] = useState(0);
	const [showStepsDetails, setShowStepsDetails] = useState(false);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		if (templateGenerationStatus?.event) {
			const stepGroup = eventToVisualStepMap[templateGenerationStatus.event];
			log.info("[useApplicationNotifications] Received mapping in AnalysingSteps", {
				event: templateGenerationStatus.event,
				stepGroup,
			});

			if (stepGroup === -1) {
				setHasError(true);
				return;
			}
			setHasError(false);

			const isIndexingEvent =
				templateGenerationStatus.event === "grant_template_generation_started" ||
				templateGenerationStatus.event === "indexing_in_progress";
			setShowStepsDetails(!isIndexingEvent);

			if (stepGroup >= 0) {
				const newVisibleSteps = stepGroup + 1;
				setMaxVisibleSteps((prev) => Math.max(prev, newVisibleSteps));
			}
		}
	}, [templateGenerationStatus]);

	if (hasError && templateGenerationStatus) {
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
								{templateGenerationStatus.message}
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative space-y-6 mt-6">
			{ANALYZING_STEPS.map((section, sectionIndex) => (
				<div className={getStepContainerClassName(sectionIndex, maxVisibleSteps)} key={sectionIndex}>
					<div className="relative">
						{shouldShowConnector(sectionIndex) && (
							<div className={getConnectorLineClassName(sectionIndex, maxVisibleSteps)} />
						)}

						<div className="mb-3 flex items-center gap-3">
							<div className={getStepNumberClassName(sectionIndex, maxVisibleSteps)}>
								<span className="text-xs font-medium">{sectionIndex + 1}</span>
							</div>
							<h4
								className={getStepTitleClassName(sectionIndex, maxVisibleSteps)}
								data-testid="analyzing-step-title"
							>
								{section.title}
							</h4>
							{isStepActive(sectionIndex, maxVisibleSteps) && (
								<div
									className="ml-2 size-2 animate-pulse rounded-full bg-blue-500"
									data-testid="step-active-indicator"
								/>
							)}
						</div>

						{showStepsDetails && (
							<div className="ml-9 space-y-2">
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
			))}
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

function InfoBanner({ onClose }: { onClose: () => void }) {
	return (
		<div className="self-stretch p-2 bg-slate-100 rounded outline-1 outline-offset-[-1px] outline-slate-400 inline-flex justify-start items-start gap-1">
			<Image alt="Info" className="shrink-0" height={16} src="/icons/icon-toast-info.svg" width={16} />
			<div className="flex-1 grow text-sm text-app-black font-normal leading-tight">
				Keep in mind that AI has limitations and may occasionally make mistakes. Always review and refine the
				output.
			</div>
			<button className="shrink-0 self-start" onClick={onClose} type="button">
				<Image
					alt="Close"
					className="hover:opacity-60 transition-opacity cursor-pointer"
					height={16}
					src="/icons/close.svg"
					width={16}
				/>
			</button>
		</div>
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
