"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useMemo, useState } from "react";
import { AppButton } from "@/components/app/buttons/app-button";
import { IconButton } from "@/components/app/buttons/icon-button";
import { AppTextarea } from "@/components/app/fields/app-textarea";
import InputField from "@/components/app/fields/input-field";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { GrantSection } from "@/types/grant-sections";
import {
	hasDetailedResearchPlan,
	hasDetailedResearchPlanUpdate,
	hasGenerationInstructions,
	hasLengthConstraint,
} from "@/types/grant-sections";
import { hasKeywords, hasSearchQueries } from "@/utils/grant-section-guards";
import { createLengthConstraint, type SectionLengthConstraint } from "@/utils/length-constraint";

const DEFAULT_WORD_LIMIT = 500;

const LENGTH_TYPES = [
	{ label: "Words", value: "words" },
	{ label: "Characters", value: "characters" },
] as const;

const getLengthLabel = (lengthConstraint: SectionLengthConstraint): string => {
	const { type, value } = lengthConstraint;
	if (type === "words") {
		return `${value.toLocaleString()} words`;
	}
	return `${value.toLocaleString()} characters`;
};

type EditableGrantSection = {
	generation_instructions: string;
	is_detailed_research_plan: boolean;
	keywords: string[];
	length_constraint: SectionLengthConstraint;
	search_queries: string[];
} & GrantSection;

export const createPredefinedTemplateSection = (parentId: null | string = null): EditableGrantSection => ({
	depends_on: [],
	evidence: "",
	generation_instructions: "",
	id: crypto.randomUUID(),
	is_clinical_trial: null,
	is_detailed_research_plan: false,
	keywords: [],
	length_constraint: createLengthConstraint(DEFAULT_WORD_LIMIT, "words"),
	needs_applicant_writing: false,
	order: 0,
	parent_id: parentId,
	search_queries: [],
	title: parentId ? "New Sub-section" : "New Section",
	topics: [],
});

const ensureEditableSection = (section: GrantSection): EditableGrantSection => {
	const defaults = createPredefinedTemplateSection(section.parent_id);

	return {
		...defaults,
		...section,
		generation_instructions: hasGenerationInstructions(section)
			? section.generation_instructions
			: defaults.generation_instructions,
		is_detailed_research_plan: hasDetailedResearchPlan(section)
			? (section.is_detailed_research_plan ?? defaults.is_detailed_research_plan)
			: defaults.is_detailed_research_plan,
		keywords: hasKeywords(section) ? section.keywords : defaults.keywords,
		length_constraint: hasLengthConstraint(section) ? section.length_constraint : defaults.length_constraint,
		search_queries: hasSearchQueries(section) ? section.search_queries : defaults.search_queries,
	};
};

const normalizeSections = (sections: GrantSection[]): EditableGrantSection[] => {
	const canonical: EditableGrantSection[] = sections.map(ensureEditableSection);
	const mains = canonical.filter((section) => section.parent_id === null).toSorted((a, b) => a.order - b.order);

	const normalized: EditableGrantSection[] = [];
	mains.forEach((mainSection) => {
		normalized.push(mainSection);
		const children = canonical
			.filter((section) => section.parent_id === mainSection.id)
			.toSorted((a, b) => a.order - b.order);
		normalized.push(...children);
	});

	return normalized.map((section, index) => ({
		...section,
		order: index,
	}));
};

const splitSiblings = (sections: EditableGrantSection[], parentId: null | string) =>
	sections.filter((section) => section.parent_id === parentId).toSorted((a, b) => a.order - b.order);

interface SectionsEditorProps {
	onChange: (nextSections: GrantSection[]) => void;
	sections: GrantSection[];
}

export function PredefinedTemplateSectionsEditor({ onChange, sections }: SectionsEditorProps) {
	const [expandedId, setExpandedId] = useState<null | string>(null);

	const normalizedSections = useMemo<EditableGrantSection[]>(() => normalizeSections(sections), [sections]);
	const mainSections = normalizedSections.filter((section) => section.parent_id === null);
	const subsectionsByParent = useMemo(() => {
		const map: Record<string, EditableGrantSection[]> = {};
		normalizedSections.forEach((section) => {
			if (section.parent_id === null) {
				return;
			}
			const parentKey = section.parent_id;
			const existing = map[parentKey] ?? [];
			existing.push(section);
			map[parentKey] = existing;
		});
		Object.keys(map).forEach((key) => {
			const entries = map[key];
			if (!entries) {
				return;
			}
			map[key] = entries.toSorted((a, b) => a.order - b.order);
		});
		return map;
	}, [normalizedSections]);

	const updateSections = (next: EditableGrantSection[]) => {
		onChange(normalizeSections(next));
	};

	const handleAddSection = (parentId: null | string = null) => {
		const next = [...normalizedSections, createPredefinedTemplateSection(parentId)];
		updateSections(next);
	};

	const handleDeleteSection = (sectionId: string) => {
		const idsToDelete = new Set<string>([sectionId]);
		normalizedSections.forEach((section) => {
			if (section.parent_id === sectionId) {
				idsToDelete.add(section.id);
			}
		});
		const remaining = normalizedSections.filter((section) => !idsToDelete.has(section.id));
		updateSections(remaining);
	};

	const handleSectionUpdate = (sectionId: string, updates: Partial<GrantSection>) => {
		const next = normalizedSections.map((section) => {
			if (section.id !== sectionId) {
				return section;
			}
			return ensureEditableSection({ ...section, ...updates });
		});

		if (hasDetailedResearchPlanUpdate(updates) && updates.is_detailed_research_plan) {
			for (const section of next) {
				if (section.id !== sectionId && hasDetailedResearchPlan(section) && section.is_detailed_research_plan) {
					section.is_detailed_research_plan = false;
				}
			}
		}

		updateSections(next);
	};

	const handleMove = (sectionId: string, direction: "down" | "up") => {
		const target = normalizedSections.find((section) => section.id === sectionId);
		if (!target) return;
		const siblings = splitSiblings(normalizedSections, target.parent_id);
		const index = siblings.findIndex((section) => section.id === sectionId);
		if (index === -1) return;
		const swapIndex = direction === "up" ? index - 1 : index + 1;
		if (swapIndex < 0 || swapIndex >= siblings.length) return;
		const siblingToSwap = siblings[swapIndex];
		if (!siblingToSwap) return;
		const next = normalizedSections.map((section) => {
			if (section.id === target.id) {
				return { ...section, order: siblingToSwap.order };
			}
			if (section.id === siblingToSwap.id) {
				return { ...section, order: target.order };
			}
			return section;
		});
		updateSections(next);
	};

	const renderSectionHeader = (
		section: EditableGrantSection,
		isSubsection: boolean,
		_isExpanded: boolean,
		lengthLabel: string,
	) => (
		<div className="flex flex-1 flex-col items-start justify-start">
			<div className="flex w-full items-center justify-start gap-1.5">
				<h3
					className={cn(
						"text-base font-semibold text-app-black",
						isSubsection ? "font-normal leading-tight" : "font-heading leading-snug",
					)}
					data-testid="section-title"
				>
					{section.title || (isSubsection ? "Untitled sub-section" : "Untitled section")}
				</h3>
				<span
					className="text-xs font-normal leading-none text-dark-gray"
					data-testid="length-constraint-display"
				>
					{lengthLabel}
				</span>
				{section.is_detailed_research_plan && (
					<span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
						Research Plan
					</span>
				)}
			</div>
		</div>
	);

	const renderSectionActions = (
		section: EditableGrantSection,
		isSubsection: boolean,
		isExpanded: boolean,
		index: number,
		siblingsLength: number,
	) => (
		<div className="flex items-center justify-end gap-1">
			<div className="opacity-0 group-hover:opacity-100 transition-opacity">
				<IconButton
					aria-label="Move section up"
					data-testid={`section-move-up-${section.id}`}
					disabled={index === 0}
					onClick={(e) => {
						e.stopPropagation();
						handleMove(section.id, "up");
					}}
					size="sm"
					type="button"
					variant="solid"
				>
					<ChevronUp className="size-4" />
				</IconButton>
			</div>
			<div className="opacity-0 group-hover:opacity-100 transition-opacity">
				<IconButton
					aria-label="Move section down"
					data-testid={`section-move-down-${section.id}`}
					disabled={index === siblingsLength - 1}
					onClick={(e) => {
						e.stopPropagation();
						handleMove(section.id, "down");
					}}
					size="sm"
					type="button"
					variant="solid"
				>
					<ChevronDown className="size-4" />
				</IconButton>
			</div>
			<div className="opacity-0 group-hover:opacity-100 transition-opacity">
				<AppButton
					aria-label="Delete section"
					className="size-6 cursor-pointer rounded-none hover:bg-gray-50"
					data-testid={`section-delete-${section.id}`}
					onClick={(e) => {
						e.stopPropagation();
						handleDeleteSection(section.id);
					}}
					size="sm"
					type="button"
					variant="ghost"
				>
					<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
				</AppButton>
			</div>
			{!isSubsection && (
				<div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
					<AppButton
						aria-label="Add subsection"
						className="size-6 cursor-pointer rounded-none hover:bg-gray-50"
						data-testid={`add-subsection-button-${section.id}`}
						onClick={(e) => {
							e.stopPropagation();
							handleAddSection(section.id);
						}}
						size="sm"
						type="button"
						variant="ghost"
					>
						<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
					</AppButton>
				</div>
			)}
			<AppButton
				aria-label={isExpanded ? "Collapse section" : "Expand section"}
				className="ml-5 size-6 cursor-pointer rounded-none hover:bg-gray-50"
				data-testid={`section-toggle-${section.id}`}
				onClick={(e) => {
					e.stopPropagation();
					setExpandedId(isExpanded ? null : section.id);
				}}
				size="sm"
				type="button"
				variant="ghost"
			>
				<Image
					alt={isExpanded ? "Collapse" : "Expand"}
					className="transition-transform duration-200"
					height={22}
					src={isExpanded ? "/icons/chevron-up.svg" : "/icons/chevron-down.svg"}
					width={22}
				/>
			</AppButton>
		</div>
	);

	const renderExpandedContent = (section: EditableGrantSection, isSubsection: boolean) => (
		<div className="transition-all duration-200 ease-in-out opacity-100" data-testid="edit-form-container">
			<div className="px-6 py-3">
				<div className="flex flex-col space-y-4 2xl:space-y-5">
					<div className="space-y-2 2xl:space-y-3">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">
							{isSubsection ? "Sub-section name" : "Section name"}
						</h3>
						<InputField
							label={isSubsection ? "Sub-section name" : "Section name"}
							onChange={(event) => {
								handleSectionUpdate(section.id, { title: event.target.value });
							}}
							placeholder="Type a name that encapsulates the essence of this section."
							testId={`section-title-${section.id}`}
							value={section.title}
						/>
					</div>

					<div className="space-y-2 2xl:space-y-3">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">
							Words/Characters count
						</h3>
						<p className="text-app-gray-600 text-base font-normal leading-tight">
							This helps AI generate content that fits the grant&apos;s requirements.
						</p>

						<div className="grid gap-3 md:grid-cols-2">
							<div>
								<Label>Length type</Label>
								<select
									className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
									data-testid={`section-length-type-${section.id}`}
									onChange={(event) => {
										handleSectionUpdate(section.id, {
											length_constraint: createLengthConstraint(
												section.length_constraint.value,
												event.target.value as "characters" | "words",
												section.length_constraint.source,
											),
										});
									}}
									value={section.length_constraint.type}
								>
									{LENGTH_TYPES.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
							<div>
								<InputField
									label="Max length"
									onChange={(event) => {
										handleSectionUpdate(section.id, {
											length_constraint: createLengthConstraint(
												Number(event.target.value) || 0,
												section.length_constraint.type,
												section.length_constraint.source,
											),
										});
									}}
									testId={`section-length-value-${section.id}`}
									type="number"
									value={section.length_constraint.value}
								/>
							</div>
						</div>
					</div>

					<div className="space-y-2 2xl:space-y-3">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">AI Prompt</h3>
						<p className="text-app-gray-600 text-base font-normal leading-tight">
							Your AI assistant will follow this instruction. Modify the prompt to reflect your topic and
							goals for a more relevant draft.
						</p>
						<Label className="block text-start text-xs font-light text-input-label mb-1">AI Prompt</Label>
						<AppTextarea
							className="min-h-[120px]"
							data-testid={`section-ai-instructions-${section.id}`}
							onChange={(event) => {
								handleSectionUpdate(section.id, {
									generation_instructions: event.target.value,
								});
							}}
							placeholder="Enter your AI prompt instructions..."
							value={section.generation_instructions}
						/>
					</div>

					<div className="space-y-2">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">
							Research Plan
						</h3>
						<p className="text-app-gray-600 text-base font-normal leading-tight">
							Is this section the main Research Plan? Each application can designate one section as the
							official Research Plan.
						</p>
					</div>

					<div className="flex items-center space-x-3">
						<Switch
							checked={section.is_detailed_research_plan}
							data-testid={`section-research-plan-${section.id}`}
							onCheckedChange={(checked) => {
								handleSectionUpdate(section.id, {
									is_detailed_research_plan: checked,
								});
							}}
						/>
						<Label className="text-sm font-normal text-gray-600">
							This section is the main Research Plan
						</Label>
					</div>

					<div className="space-y-2 2xl:space-y-3">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">Keywords</h3>
						<AppTextarea
							data-testid={`section-keywords-${section.id}`}
							onChange={(event) => {
								handleSectionUpdate(section.id, {
									keywords: event.target.value
										.split(",")
										.map((keyword) => keyword.trim())
										.filter(Boolean),
								});
							}}
							placeholder="Specific aims, impact, innovation"
							value={section.keywords.join(", ")}
						/>
					</div>

					<div className="space-y-2 2xl:space-y-3">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">
							Search queries
						</h3>
						<AppTextarea
							data-testid={`section-search-queries-${section.id}`}
							onChange={(event) => {
								handleSectionUpdate(section.id, {
									search_queries: event.target.value
										.split("\n")
										.map((query) => query.trim())
										.filter(Boolean),
								});
							}}
							placeholder="research strategy guidance&#10;biomarker validation plan"
							value={section.search_queries.join("\n")}
						/>
					</div>
				</div>

				{!isSubsection && (
					<div className="flex justify-between items-center gap-2 pt-6">
						<AppButton
							data-testid={`add-subsection-button-${section.id}`}
							iconContainerClass="mr-1"
							keepIconSize
							leftIcon={<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />}
							onClick={() => {
								handleAddSection(section.id);
							}}
							variant="link"
						>
							Add Sub-section
						</AppButton>
					</div>
				)}
			</div>
		</div>
	);

	const renderSection = (section: EditableGrantSection, isSubsection = false): React.JSX.Element => {
		const siblings = splitSiblings(normalizedSections, section.parent_id);
		const index = siblings.findIndex((item) => item.id === section.id);
		const isExpanded = expandedId === section.id;
		const subsections = subsectionsByParent[section.id] ?? [];
		const lengthLabel = getLengthLabel(section.length_constraint);

		return (
			<>
				<div
					className={cn(
						"group rounded outline-1 outline-offset-[-1px] outline-primary hover:outline-2 transition-all duration-200 bg-white mb-4",
						isSubsection ? "ml-[6.875rem] px-3 py-2" : "px-3 py-3 2xl:py-4",
					)}
					data-testid={`template-section-${section.id}`}
					key={section.id}
				>
					<div
						className={cn(
							"flex items-center justify-start cursor-pointer",
							isSubsection ? "gap-2" : "gap-5",
						)}
						onClick={() => {
							setExpandedId(isExpanded ? null : section.id);
						}}
						onKeyDown={(e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault();
								setExpandedId(isExpanded ? null : section.id);
							}
						}}
						role="button"
						tabIndex={0}
					>
						<div className="flex flex-1 items-center justify-between">
							{renderSectionHeader(section, isSubsection, isExpanded, lengthLabel)}
							{renderSectionActions(section, isSubsection, isExpanded, index, siblings.length)}
						</div>
					</div>

					{isExpanded && renderExpandedContent(section, isSubsection)}
				</div>
				{!isSubsection && subsections.map((child) => renderSection(child, true))}
			</>
		);
	};

	return (
		<div data-testid="predefined-template-sections-editor">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h2 className="font-heading text-xl font-semibold text-app-black leading-snug">Grant Sections</h2>
					<p className="text-sm text-app-gray-600 font-body leading-tight">
						Structure and maintain the sections that will be cloned into generated templates.
					</p>
				</div>
				<AppButton
					data-testid="add-section-button"
					onClick={() => {
						handleAddSection();
					}}
					type="button"
				>
					Add section
				</AppButton>
			</div>
			{mainSections.length === 0 ? (
				<div className="rounded border border-dashed p-6 text-center text-sm text-app-gray-600">
					Add sections to define the template structure.
				</div>
			) : (
				mainSections.map((section) => renderSection(section))
			)}
		</div>
	);
}
