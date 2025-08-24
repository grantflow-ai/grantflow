"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { AppButton } from "@/components/app/buttons";
import { AppTextarea, InputField } from "@/components/app/fields";
import { ThemeBadge } from "@/components/shared";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { GrantSection, UpdateGrantSection } from "@/types";
import { hasDetailedResearchPlan, hasGenerationInstructions, hasMaxWords } from "@/types";
import { SectionWithDropIndicators } from "./section-drop-indicator";
import { SectionIconButton } from "./section-icon-button";

const aiPrompt = (sectionTitle: string): string => {
	return `Using the following research context and objectives, write a compelling '${sectionTitle}' section for a research grant application. The text should explain the problem area, provide a brief overview of current knowledge, and justify the need for this study. Use a clear and academic tone, suitable for a grant reviewer audience.
Output format: Paragraphs, no bullet points`;
};

interface SectionEditFormProps {
	formData: SectionFormData;
	isSubsection: boolean;
	onCancel: () => void;
	onSave: () => void;
	section: GrantSection;
	setFormData: (data: SectionFormData) => void;
}

interface SectionFormData {
	aiPrompt: string;
	isResearchPlan?: boolean;
	max_words: number;
	title: string;
	useWords: boolean;
}

interface SectionHeaderProps {
	attributes: any;
	isDragDisabled?: boolean;
	isExpanded: boolean;
	isSubsection: boolean;
	listeners: any;
	onAddSubsection?: (parentId: string) => void;
	onDelete: () => void;
	onHeaderClick: (e: React.MouseEvent) => void;
	onToggleExpand: () => void;
	section: GrantSection;
	sectionHasMaxWords: boolean;
}

interface SortableSectionProps {
	isDetailedSection: (section: GrantSection) => boolean;
	isDragDisabled?: boolean;
	isExpanded: boolean;
	isSubsection?: boolean;
	onAddSubsection?: (parentId: string) => void;
	onDelete: () => void;
	onToggleExpand: () => void;
	onUpdate: (updates: Partial<GrantSection>) => void;
	section: GrantSection;
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
}

export function SortableSection({
	isDetailedSection: _isDetailedSection,
	isDragDisabled = false,
	isExpanded,
	isSubsection = false,
	onAddSubsection,
	onDelete: _onDelete,
	onToggleExpand,
	onUpdate,
	section,
	toUpdateGrantSection: _toUpdateGrantSection,
}: SortableSectionProps) {
	const {
		active,
		attributes,
		isDragging: isCurrentlyDragging,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({
		data: {
			section,
			type: "section",
		},
		id: section.id,
	});

	const generatedAiPrompt = aiPrompt(section.title);
	const sectionInstructions = hasGenerationInstructions(section) ? section.generation_instructions : null;
	const effectiveAiPrompt = sectionInstructions ?? generatedAiPrompt;

	const [formData, setFormData] = useState<SectionFormData>({
		aiPrompt: effectiveAiPrompt,
		isResearchPlan: hasDetailedResearchPlan(section) ? (section.is_detailed_research_plan ?? false) : false,
		max_words: hasMaxWords(section) ? section.max_words : 3000,
		title: section.title,
		useWords: true,
	});

	useEffect(() => {
		setFormData({
			aiPrompt: effectiveAiPrompt,
			isResearchPlan: hasDetailedResearchPlan(section) ? (section.is_detailed_research_plan ?? false) : false,
			max_words: hasMaxWords(section) ? section.max_words : 3000,
			title: section.title,
			useWords: true,
		});
	}, [section, effectiveAiPrompt]);

	const style = {
		opacity: isCurrentlyDragging ? 0.5 : 1,
		transform: active ? "none" : CSS.Transform.toString(transform),
		transition: isCurrentlyDragging ? "none" : transition,
	};

	const sectionHasMaxWords = hasMaxWords(section) && Boolean(section.max_words);

	const handleSave = useCallback(() => {
		onUpdate({
			max_words: formData.max_words,
			title: formData.title,
			...(formData.isResearchPlan !== undefined && {
				is_detailed_research_plan: formData.isResearchPlan,
			}),
		});
		onToggleExpand();
	}, [formData, onUpdate, onToggleExpand]);

	const handleHeaderClick = useCallback(
		(e: React.MouseEvent) => {
			const target = e.target as HTMLElement;
			const isInteractiveElement =
				target.closest('[data-interactive="true"]') ??
				target.closest("button") ??
				(target.closest('[role="button"]') && !target.closest('[data-header="true"]'));

			if (!isInteractiveElement) {
				onToggleExpand();
			}
		},
		[onToggleExpand],
	);

	return (
		<SectionWithDropIndicators section={section}>
			<div
				className={`group rounded outline-1 outline-offset-[-1px] outline-primary transition-all duration-200 hover:outline-2 ${isCurrentlyDragging ? "bg-app-gray-500" : "bg-white"} ${isSubsection ? "ml-[6.875rem] px-3 py-2" : "px-3 py-4"}`}
				data-sortable-id={section.id}
				data-testid="section-container"
				ref={setNodeRef}
				style={style}
			>
				<SectionHeader
					attributes={attributes}
					isDragDisabled={isDragDisabled}
					isExpanded={isExpanded}
					isSubsection={isSubsection}
					listeners={listeners}
					onAddSubsection={onAddSubsection}
					onDelete={_onDelete}
					onHeaderClick={handleHeaderClick}
					onToggleExpand={onToggleExpand}
					section={section}
					sectionHasMaxWords={sectionHasMaxWords}
				/>

				{isExpanded && (
					<div
						className="overflow-hidden transition-all duration-200 ease-in-out opacity-100"
						data-testid="edit-form-container"
					>
						<SectionEditForm
							formData={formData}
							isSubsection={isSubsection}
							onCancel={onToggleExpand}
							onSave={handleSave}
							section={section}
							setFormData={setFormData}
						/>
					</div>
				)}
			</div>
		</SectionWithDropIndicators>
	);
}

function SectionEditForm({ formData, isSubsection, onCancel, onSave, section, setFormData }: SectionEditFormProps) {
	return (
		<div className="px-6 py-3">
			<div className="space-y-5">
				<div className="space-y-3">
					<h3
						className="font-heading leading-snug text-base font-semibold text-app-black"
						data-testid={`edit-form-header-${section.id}`}
					>
						{isSubsection ? "Sub-section name" : "Section name"}
					</h3>
					<InputField
						label={isSubsection ? "Sub-section name" : "Section name"}
						onChange={(e) => {
							setFormData({ ...formData, title: e.target.value });
						}}
						placeholder="Type a name that encapsulates the essence of this section."
						testId={`section-name-${section.id}`}
						value={formData.title}
					/>
				</div>

				<div className="space-y-2">
					<h3
						className="font-heading leading-snug text-base font-semibold text-app-black"
						data-testid="words-characters-label"
					>
						Words/Characters count
					</h3>
					<p className="text-app-gray-600 text-base font-normal leading-tight">
						This helps AI generate content that fits the grant&apos;s requirements. Choose if the limit
						applies to words or characters.
					</p>
				</div>

				<div className="flex gap-4 h-12">
					<div className="flex-1">
						<InputField
							label={`Max ${formData.useWords ? "words" : "characters"}`}
							onChange={(e) => {
								setFormData({
									...formData,
									max_words: Number.parseInt(e.target.value, 10) || 0,
								});
							}}
							placeholder="3,000"
							testId={`max-count-${section.id}`}
							type="number"
							value={formData.max_words}
						/>
					</div>
					<div className="flex-1 items-center w-full">
						<Label className="block text-start text-xs font-light text-input-label">Words/Characters</Label>
						<Select
							onValueChange={(value) => {
								setFormData({ ...formData, useWords: value === "words" });
							}}
							value={formData.useWords ? "words" : "characters"}
						>
							<SelectTrigger className="w-full" data-testid="word-character-selector">
								<SelectValue />
							</SelectTrigger>
							<SelectContent data-testid="word-character-dropdown">
								<SelectItem data-testid="words-option" value="words">
									Words
								</SelectItem>
								<SelectItem data-testid="characters-option" value="characters">
									Characters
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{!isSubsection && (
					<div className="space-y-2">
						<h3 className="font-heading leading-snug text-base font-semibold text-app-black">AI Prompt</h3>
						<p className="text-app-gray-600 text-base font-normal leading-tight">
							Your AI assistant will follow this instruction. Modify the prompt to reflect your topic and
							goals for a more relevant draft.
						</p>
					</div>
				)}

				<div>
					<Label
						className="block text-start text-xs font-light text-input-label mb-1"
						htmlFor={`ai-prompt-${section.id}`}
					>
						AI Prompt
					</Label>
					<AppTextarea
						className="min-h-[120px]"
						id={`ai-prompt-${section.id}`}
						onChange={(e) => {
							setFormData({ ...formData, aiPrompt: e.target.value });
						}}
						placeholder="Enter your AI prompt instructions..."
						value={formData.aiPrompt}
					/>
				</div>

				<div className="space-y-2">
					<h3 className="font-heading leading-snug text-base font-semibold text-app-black">Research Plan</h3>
					<p className="text-app-gray-600 text-base font-normal leading-tight">
						Is this section the main Research Plan? Each application can designate one section as the
						official Research Plan.
					</p>
				</div>

				<div className="flex items-center space-x-3">
					<button
						aria-checked={formData.isResearchPlan}
						className={`relative inline-flex h-3.5 w-6 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
							formData.isResearchPlan ? "bg-primary" : "bg-gray-200"
						}`}
						data-testid="research-plan-checkbox"
						id={`research-plan-${section.id}`}
						onClick={() => {
							setFormData({
								...formData,
								isResearchPlan: !formData.isResearchPlan,
							});
						}}
						role="switch"
						type="button"
					>
						<span
							className={`pointer-events-none inline-block size-2.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
								formData.isResearchPlan ? "translate-x-5" : "translate-x-0"
							}`}
						/>
					</button>
					<Label
						className="text-sm font-normal text-gray-600 cursor-pointer"
						data-testid="research-plan-label"
						htmlFor={`research-plan-${section.id}`}
						onClick={() => {
							setFormData({
								...formData,
								isResearchPlan: !formData.isResearchPlan,
							});
						}}
					>
						This section is the main Research Plan
					</Label>
				</div>
			</div>

			<div className="flex justify-between gap-2 pt-6">
				<AppButton data-testid="cancel-button" onClick={onCancel} variant="secondary">
					Cancel
				</AppButton>
				<AppButton data-testid="save-button" onClick={onSave}>
					Save
				</AppButton>
			</div>
		</div>
	);
}

function SectionHeader({
	attributes,
	isDragDisabled = false,
	isExpanded,
	isSubsection,
	listeners,
	onAddSubsection,
	onDelete,
	onHeaderClick,
	onToggleExpand,
	section,
	sectionHasMaxWords,
}: SectionHeaderProps) {
	return (
		<div
			aria-expanded={isExpanded}
			aria-label={`${isExpanded ? "Collapse" : "Expand"} ${section.title} section`}
			className={`flex items-center justify-start cursor-pointer ${isSubsection ? "gap-2" : "gap-5"}`}
			data-header="true"
			onClick={onHeaderClick}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					onHeaderClick(e as unknown as React.MouseEvent);
				}
			}}
			role="button"
			tabIndex={0}
		>
			<div
				{...(isDragDisabled ? {} : attributes)}
				{...(isDragDisabled ? {} : listeners)}
				className={`relative size-6 ${isDragDisabled ? "cursor-not-allowed opacity-50" : "cursor-grab hover:cursor-grab active:cursor-grabbing"}`}
				data-interactive="true"
			>
				<GripVertical
					className={`size-6 ${isDragDisabled ? "text-gray-300" : "text-gray-400 hover:text-gray-600"} transition-colors`}
				/>
			</div>

			<div className="flex flex-1 items-center justify-between">
				<div className="flex flex-1 flex-col items-start justify-start">
					<div className="flex w-full items-center justify-start gap-1.5">
						<h3
							className={`${isSubsection ? "font-normal leading-tight" : "font-heading leading-snug"} text-base font-semibold text-app-black`}
							data-testid="section-title"
						>
							{section.title}
						</h3>
						{sectionHasMaxWords && hasMaxWords(section) && (
							<span
								className="text-xs font-normal leading-none text-dark-gray"
								data-testid="max-words-display"
							>
								{section.max_words.toLocaleString()} Max words
							</span>
						)}
						{hasDetailedResearchPlan(section) && section.is_detailed_research_plan && (
							<ThemeBadge
								color="secondary"
								data-testid="research-plan-badge"
								leftIcon={
									<Image alt="Research Plan" height={12} src="/icons/research-plan.svg" width={12} />
								}
							>
								Research Plan
							</ThemeBadge>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end" data-interactive="true">
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<SectionIconButton
									className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
									data-testid="delete-section-button"
									onClick={onDelete}
								>
									<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
								</SectionIconButton>
							</TooltipTrigger>
							<TooltipContent sideOffset={5}>
								<p>{isSubsection ? "Delete Sub-section" : "Delete Section"}</p>
							</TooltipContent>
						</Tooltip>

						{!isSubsection && (
							<Tooltip>
								<TooltipTrigger asChild>
									<SectionIconButton
										className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
										data-testid="add-subsection-button"
										onClick={() => onAddSubsection?.(section.id)}
									>
										<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
									</SectionIconButton>
								</TooltipTrigger>
								<TooltipContent sideOffset={5}>
									<p>Add Sub-section</p>
								</TooltipContent>
							</Tooltip>
						)}
					</TooltipProvider>

					<SectionIconButton className="ml-5" data-testid="expand-section-button" onClick={onToggleExpand}>
						<Image
							alt={isExpanded ? "Collapse" : "Expand"}
							className="transition-transform duration-200"
							height={22}
							src={isExpanded ? "/icons/chevron-up.svg" : "/icons/chevron-down.svg"}
							width={22}
						/>
					</SectionIconButton>
				</div>
			</div>
		</div>
	);
}
