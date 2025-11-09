"use client";

import { useMemo, useState } from "react";
import { AppTextarea } from "@/components/app/fields/app-textarea";
import InputField from "@/components/app/fields/input-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { GrantSection } from "@/types/grant-sections";
import {
	hasDetailedResearchPlan,
	hasDetailedResearchPlanUpdate,
	hasGenerationInstructions,
	hasKeywords,
	hasLengthConstraint,
	hasSearchQueries,
} from "@/types/grant-sections";
import { createLengthConstraint, type SectionLengthConstraint } from "@/utils/length-constraint";

const DEFAULT_WORD_LIMIT = 500;

const LENGTH_TYPES = [
	{ label: "Words", value: "words" },
	{ label: "Characters", value: "characters" },
] as const;

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
	const base = createPredefinedTemplateSection(section.parent_id);

	let generationInstructions = base.generation_instructions;
	if (hasGenerationInstructions(section)) {
		const withInstructions = section as { generation_instructions?: null | string } & GrantSection;
		generationInstructions = withInstructions.generation_instructions ?? generationInstructions;
	}

	let detailedResearchPlan = base.is_detailed_research_plan;
	if (hasDetailedResearchPlan(section)) {
		const withResearchPlan = section as { is_detailed_research_plan?: boolean | null } & GrantSection;
		detailedResearchPlan = withResearchPlan.is_detailed_research_plan ?? detailedResearchPlan;
	}

	let { keywords } = base;
	if (hasKeywords(section)) {
		const withKeywords = section as { keywords?: null | string[] } & GrantSection;
		keywords = withKeywords.keywords ?? keywords;
	}

	let lengthConstraint = base.length_constraint;
	if (hasLengthConstraint(section)) {
		const withLengthConstraint = section as { length_constraint?: SectionLengthConstraint } & GrantSection;
		lengthConstraint = withLengthConstraint.length_constraint ?? lengthConstraint;
	}

	let searchQueries = base.search_queries;
	if (hasSearchQueries(section)) {
		const withSearchQueries = section as { search_queries?: null | string[] } & GrantSection;
		searchQueries = withSearchQueries.search_queries ?? searchQueries;
	}

	return {
		...base,
		...section,
		generation_instructions: generationInstructions,
		is_detailed_research_plan: detailedResearchPlan,
		keywords,
		length_constraint: lengthConstraint,
		search_queries: searchQueries,
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

const resolveLengthConstraint = (section: EditableGrantSection) => section.length_constraint;

const resolveGenerationInstructions = (section: EditableGrantSection) => section.generation_instructions;

const resolveKeywords = (section: EditableGrantSection) => section.keywords;

const resolveSearchQueries = (section: EditableGrantSection) => section.search_queries;

const resolveIsResearchPlan = (section: EditableGrantSection) => section.is_detailed_research_plan;

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
			if (!Object.hasOwn(map, section.parent_id)) {
				map[section.parent_id] = [];
			}
			map[section.parent_id].push(section);
		});
		Object.keys(map).forEach((key) => {
			map[key] = map[key].toSorted((a, b) => a.order - b.order);
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

	const renderSection = (section: EditableGrantSection, isSubsection = false) => {
		const lengthConstraint = resolveLengthConstraint(section);
		const generationInstructions = resolveGenerationInstructions(section);
		const keywords = resolveKeywords(section);
		const searchQueries = resolveSearchQueries(section);
		const isResearchPlan = resolveIsResearchPlan(section);
		const siblings = splitSiblings(normalizedSections, section.parent_id);
		const index = siblings.findIndex((item) => item.id === section.id);
		const isExpanded = expandedId === section.id;
		const subsections = subsectionsByParent[section.id] ?? [];

		return (
			<Card
				className={cn("mb-4", isSubsection && "ml-8 border-dashed")}
				data-testid={`template-section-${section.id}`}
				key={section.id}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0">
					<CardTitle className="text-base font-semibold">
						{section.title || (isSubsection ? "Untitled sub-section" : "Untitled section")}
					</CardTitle>
					<div className="flex gap-2">
						<Button
							aria-label={isExpanded ? "Collapse section" : "Expand section"}
							data-testid={`section-toggle-${section.id}`}
							onClick={() => {
								setExpandedId(isExpanded ? null : section.id);
							}}
							size="sm"
							type="button"
							variant="secondary"
						>
							{isExpanded ? "Collapse" : "Expand"}
						</Button>
						<Button
							aria-label="Move section up"
							data-testid={`section-move-up-${section.id}`}
							disabled={index === 0}
							onClick={() => {
								handleMove(section.id, "up");
							}}
							size="icon"
							type="button"
							variant="ghost"
						>
							↑
						</Button>
						<Button
							aria-label="Move section down"
							data-testid={`section-move-down-${section.id}`}
							disabled={index === siblings.length - 1}
							onClick={() => {
								handleMove(section.id, "down");
							}}
							size="icon"
							type="button"
							variant="ghost"
						>
							↓
						</Button>
						<Button
							aria-label="Delete section"
							data-testid={`section-delete-${section.id}`}
							onClick={() => {
								handleDeleteSection(section.id);
							}}
							size="icon"
							type="button"
							variant="destructive"
						>
							✕
						</Button>
					</div>
				</CardHeader>
				{isExpanded && (
					<CardContent className="space-y-6">
						<InputField
							label={isSubsection ? "Sub-section title" : "Section title"}
							onChange={(event) => {
								handleSectionUpdate(section.id, { title: event.target.value });
							}}
							testId={`section-title-${section.id}`}
							value={section.title}
						/>
						<div className="grid gap-3 md:grid-cols-2">
							<div>
								<Label>Length type</Label>
								<select
									className="w-full rounded border border-input bg-background px-3 py-2 text-sm"
									data-testid={`section-length-type-${section.id}`}
									onChange={(event) => {
										handleSectionUpdate(section.id, {
											length_constraint: createLengthConstraint(
												lengthConstraint.value,
												event.target.value as "characters" | "words",
												lengthConstraint.source,
											),
										});
									}}
									value={lengthConstraint.type}
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
												lengthConstraint.type,
												lengthConstraint.source,
											),
										});
									}}
									testId={`section-length-value-${section.id}`}
									type="number"
									value={lengthConstraint.value}
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label>AI Instructions</Label>
							<AppTextarea
								data-testid={`section-ai-instructions-${section.id}`}
								onChange={(event) => {
									handleSectionUpdate(section.id, { generation_instructions: event.target.value });
								}}
								placeholder="Provide detailed generation instructions"
								value={generationInstructions}
							/>
						</div>
						<div className="flex items-center justify-between rounded border border-dashed p-3">
							<div>
								<p className="text-sm font-medium">Is Research Plan</p>
								<p className="text-xs text-muted-foreground">
									Toggle to designate this section as the primary Research Plan.
								</p>
							</div>
							<Switch
								checked={isResearchPlan}
								data-testid={`section-research-plan-${section.id}`}
								onCheckedChange={(checked) => {
									handleSectionUpdate(section.id, {
										is_detailed_research_plan: checked,
									});
								}}
							/>
						</div>
						<div className="grid gap-3 md:grid-cols-2">
							<div className="space-y-1">
								<Label>Keywords</Label>
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
									value={keywords.join(", ")}
								/>
							</div>
							<div className="space-y-1">
								<Label>Search queries</Label>
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
									placeholder="research strategy guidance\nbiomarker validation plan"
									value={searchQueries.join("\n")}
								/>
							</div>
						</div>
						{!isSubsection && (
							<Button
								data-testid={`add-subsection-button-${section.id}`}
								onClick={() => {
									handleAddSection(section.id);
								}}
								size="sm"
								type="button"
								variant="outline"
							>
								Add sub-section
							</Button>
						)}
					</CardContent>
				)}
				{!isSubsection && subsections.map((child) => renderSection(child, true))}
			</Card>
		);
	};

	return (
		<div data-testid="predefined-template-sections-editor">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="text-lg font-semibold">Grant sections</h2>
					<p className="text-sm text-muted-foreground">
						Structure and maintain the sections that will be cloned into generated templates.
					</p>
				</div>
				<Button
					data-testid="add-section-button"
					onClick={() => {
						handleAddSection();
					}}
					type="button"
				>
					Add section
				</Button>
			</div>
			{mainSections.length === 0 ? (
				<div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
					Add sections to define the template structure.
				</div>
			) : (
				mainSections.map((section) => renderSection(section))
			)}
		</div>
	);
}
