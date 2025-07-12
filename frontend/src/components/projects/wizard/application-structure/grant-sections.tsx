import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { AppButton, InputField } from "@/components/app";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionEditFormProps {
	formData: SectionFormData;
	isDetailedSection: (section: GrantSection) => boolean;
	isDragging: boolean;
	isSubsection: boolean;
	onCancel: () => void;
	onSave: () => void;
	section: GrantSection;
	setFormData: (data: SectionFormData) => void;
	setNodeRef: (node: HTMLElement | null) => void;
	style: React.CSSProperties;
}

interface SectionFormData {
	isResearchPlan?: boolean;
	max_words: number;
	title: string;
	useWords: boolean;
}

interface SortableSectionProps {
	isDetailedSection: (section: GrantSection) => boolean;
	isDragging?: boolean;
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
	isDragging = false,
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
		attributes,
		isDragging: isCurrentlyDragging,
		listeners,
		setNodeRef,
		transform,
		transition,
	} = useSortable({ id: section.id });

	const [formData, setFormData] = useState<SectionFormData>({
		isResearchPlan: "max_words" in section ? (section.is_detailed_research_plan ?? false) : false,
		max_words: "max_words" in section ? section.max_words : 3000,
		title: section.title,
		useWords: true,
	});

	useEffect(() => {
		setFormData({
			isResearchPlan: "max_words" in section ? (section.is_detailed_research_plan ?? false) : false,
			max_words: "max_words" in section ? section.max_words : 3000,
			title: section.title,
			useWords: true,
		});
	}, [section]);

	const style = {
		opacity: isCurrentlyDragging ? 0.5 : 1,
		transform: CSS.Transform.toString(transform),
		transition,
	};

	const hasMaxWords = "max_words" in section && section.max_words;

	const handleSave = useCallback(() => {
		onUpdate({
			max_words: formData.max_words,
			title: formData.title,
			...(formData.isResearchPlan !== undefined && { is_detailed_research_plan: formData.isResearchPlan }),
		});
		onToggleExpand();
	}, [formData, onUpdate, onToggleExpand]);

	if (isExpanded) {
		return (
			<SectionEditForm
				formData={formData}
				isDetailedSection={_isDetailedSection}
				isDragging={isDragging}
				isSubsection={isSubsection}
				onCancel={onToggleExpand}
				onSave={handleSave}
				section={section}
				setFormData={setFormData}
				setNodeRef={setNodeRef}
				style={style}
			/>
		);
	}

	return (
		<div
			className={`flex items-center justify-start gap-5 rounded bg-white outline-1 outline-offset-[-1px] outline-blue-500 hover:outline-2 ${isSubsection ? "ml-[6.875rem] px-2 py-3" : "px-3 py-4"} ${
				isDragging ? "shadow-lg" : ""
			}`}
			data-testid="section-container"
			ref={setNodeRef}
			style={style}
		>
			<div
				{...attributes}
				{...listeners}
				className="relative size-6 cursor-grab hover:cursor-grab active:cursor-grabbing"
			>
				<GripVertical className="size-6 text-gray-400 hover:text-gray-600 transition-colors" />
			</div>

			<div className="flex flex-1 items-center justify-between ">
				<div className="flex flex-1 flex-col items-start justify-start ">
					<div className="flex w-full items-center justify-start gap-2 ">
						<h3 className=" text-base font-medium text-gray-900" data-testid="section-title">
							{section.title}
						</h3>
						{hasMaxWords && "max_words" in section && (
							<span className=" text-sm font-normal text-gray-500" data-testid="max-words-display">
								{section.max_words.toLocaleString()} Max words
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end ">
					<SectionIconButton data-testid="delete-section-button" onClick={_onDelete}>
						<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
					</SectionIconButton>

					{!isSubsection && (
						<SectionIconButton
							className="ml-1"
							data-testid="add-subsection-button"
							onClick={() => onAddSubsection?.(section.id)}
						>
							<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
						</SectionIconButton>
					)}

					<SectionIconButton className="ml-5" data-testid="expand-section-button" onClick={onToggleExpand}>
						<Image alt="Expand" height={22} src="/icons/chevron-down.svg" width={22} />
					</SectionIconButton>
				</div>
			</div>
		</div>
	);
}

function SectionEditForm({
	formData,
	isDetailedSection: _isDetailedSection,
	isDragging,
	isSubsection,
	onCancel,
	onSave,
	section,
	setFormData,
	setNodeRef,
	style,
}: SectionEditFormProps) {
	return (
		<div
			className={`rounded border border-gray-200 p-4 ${isSubsection ? "ml-6" : ""} ${
				isDragging ? "shadow-lg" : ""
			}`}
			data-testid="edit-form-container"
			ref={setNodeRef}
			style={style}
		>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h5 className="font-medium" data-testid="edit-form-header">
						New section
					</h5>
					<SectionIconButton className="size-4 rounded" onClick={onCancel}>
						<Image alt="Collapse" className="size-2.5" height={10} src="/icons/chevron-up.svg" width={10} />
					</SectionIconButton>
				</div>

				<div className="space-y-4">
					<div>
						<InputField
							label="Section name"
							onChange={(e) => {
								setFormData({ ...formData, title: e.target.value });
							}}
							placeholder="Type a name that encapsulates the essence of this section."
							testId={`section-name-${section.id}`}
							value={formData.title}
						/>
					</div>

					<div>
						<Label data-testid="words-characters-label">Words/Characters count</Label>
						<p className="text-muted-foreground text-sm">
							This helps AI generate content that fits the grant&apos;s requirements. Choose if the limit
							applies to words or characters.
						</p>
						<div className="mt-2 flex gap-4">
							<div className="flex-1">
								<InputField
									onChange={(e) => {
										setFormData({
											...formData,
											max_words: Number.parseInt(e.target.value) || 0,
										});
									}}
									placeholder="3,000"
									testId={`max-count-${section.id}`}
									type="number"
									value={formData.max_words}
								/>
							</div>
							<div className="w-32">
								<select
									className="border-input bg-background flex h-10 w-full rounded-md border px-3 py-2 text-sm"
									data-testid="word-character-selector"
									onChange={(e) => {
										setFormData({ ...formData, useWords: e.target.value === "words" });
									}}
									value={formData.useWords ? "words" : "characters"}
								>
									<option value="words">Words</option>
									<option value="characters">Characters</option>
								</select>
							</div>
						</div>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							checked={formData.isResearchPlan}
							data-testid="research-plan-checkbox"
							id={`research-plan-${section.id}`}
							onCheckedChange={(checked) => {
								setFormData({ ...formData, isResearchPlan: checked as boolean });
							}}
						/>
						<Label
							className="text-sm font-normal"
							data-testid="research-plan-label"
							htmlFor={`research-plan-${section.id}`}
						>
							This is the main Research Plan
						</Label>
					</div>

					<div className="flex justify-between gap-2">
						<AppButton data-testid="cancel-button" onClick={onCancel} variant="secondary">
							Cancel
						</AppButton>
						<AppButton data-testid="save-button" onClick={onSave}>
							Save
						</AppButton>
					</div>
				</div>
			</div>
		</div>
	);
}
