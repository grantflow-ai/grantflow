"use client";

import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type DragDropHandlers, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { SortableSection } from "./grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionListProps {
	expandedSectionId: null | string;
	handleAddNewSection: (parentId?: null | string) => Promise<void>;
	handleDeleteSection: (sectionId: string, sectionParentId: string) => Promise<void>;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	isDetailedSection: (section: GrantSection) => boolean;
	mainSections: GrantSection[];
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
}

import type { RefObject } from "react";
import { AppButton } from "@/components/app";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/shared/wizard-dialog";

export function DragDropSectionManager({
	dialogRef,
	isDetailedSection,
	onAddSection,
}: {
	dialogRef: RefObject<null | WizardDialogRef>;
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
}) {
	const grantSections = useApplicationStore((state) => state.application?.grant_template?.grant_sections) ?? [];
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(null);
	const [pendingParentChange, setPendingParentChange] = useState<{
		newParentId: null | string;
		sectionId: string;
	} | null>(null);

	const toUpdateGrantSection = useCallback(
		(section: GrantSection): UpdateGrantSection => {
			if (isDetailedSection(section)) {
				return section as UpdateGrantSection;
			}

			return {
				depends_on: [],
				generation_instructions: "",
				id: section.id,
				is_clinical_trial: null,
				is_detailed_research_plan: null,
				keywords: [],
				max_words: 3000,
				order: section.order,
				parent_id: section.parent_id,
				search_queries: [],
				title: section.title,
				topics: [],
			};
		},
		[isDetailedSection],
	);

	const wouldCreateInvalidNesting = useCallback(
		(activeSection: GrantSection, overSection: GrantSection) => {
			if (overSection.parent_id !== null && activeSection.parent_id === null) {
				const hasChildren = grantSections.some((section) => section.parent_id === activeSection.id);
				if (hasChildren) {
					return true;
				}
			}

			return false;
		},
		[grantSections],
	);

	const determineNewParentId = useCallback((activeSection: GrantSection, overSection: GrantSection) => {
		const activeIsMain = activeSection.parent_id === null;
		const overIsMain = overSection.parent_id === null;

		if (activeIsMain) {
			return null;
		}

		if (overIsMain) {
			return overSection.id;
		}

		return overSection.parent_id;
	}, []);

	const toggleSectionExpanded = useCallback((sectionId: string) => {
		setExpandedSectionId((prev) => {
			if (prev === sectionId) {
				return null;
			}
			return sectionId;
		});
	}, []);

	const handleUpdateSection = useCallback(
		async (sectionId: string, updates: Partial<GrantSection>) => {
			const updatedSections = grantSections.map((section) => {
				if (section.id === sectionId) {
					return toUpdateGrantSection({ ...section, ...updates });
				}
				return toUpdateGrantSection(section);
			});
			await useApplicationStore.getState().updateGrantSections(updatedSections);
		},
		[grantSections, toUpdateGrantSection],
	);

	const performDelete = useCallback(
		async (sectionId: string) => {
			const sectionToDelete = grantSections.find((section) => section.id === sectionId);
			if (!sectionToDelete) return;

			const sectionsToDelete = [sectionId];
			if (sectionToDelete.parent_id === null) {
				const subSections = grantSections.filter((section) => section.parent_id === sectionId);
				sectionsToDelete.push(...subSections.map((section) => section.id));
			}

			const updatedSections = grantSections
				.filter((section) => !sectionsToDelete.includes(section.id))
				.map(toUpdateGrantSection);
			await useApplicationStore.getState().updateGrantSections(updatedSections);
			setExpandedSectionId((prev) => (prev === sectionId ? null : prev));
		},
		[grantSections, toUpdateGrantSection],
	);

	const showDeleteConfirmation = useCallback(
		(sectionId: string) => {
			const section = grantSections.find((s) => s.id === sectionId);
			if (!section) return;

			const subSections = grantSections.filter((s) => s.parent_id === sectionId);
			const hasSubSections = subSections.length > 0;

			dialogRef.current?.open({
				content: null,
				description: hasSubSections
					? "All content within this section and its sub-sections will be permanently removed. This action cannot be undone."
					: "All content within this section will be permanently removed. This action cannot be undone.",
				dismissOnOutsideClick: false,
				footer: (
					<div className="flex justify-between w-full">
						<AppButton
							data-testid="cancel-delete-button"
							onClick={() => dialogRef.current?.close()}
							variant="secondary"
						>
							Cancel
						</AppButton>
						<AppButton
							data-testid="confirm-delete-button"
							onClick={async () => {
								await performDelete(sectionId);
								dialogRef.current?.close();
							}}
							variant="primary"
						>
							Delete Section
						</AppButton>
					</div>
				),
				minWidth: "min-w-xl",
				title: "Are you sure you want to delete this section?",
			});
		},
		[grantSections, dialogRef, performDelete],
	);

	const handleDeleteSection = useCallback(
		async (sectionId: string, sectionParentId: string) => {
			if (sectionParentId) {
				await performDelete(sectionId);
				return;
			}
			showDeleteConfirmation(sectionId);
		},
		[showDeleteConfirmation, performDelete],
	);

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const dragHandlers: DragDropHandlers<GrantSection> = useMemo(
		() => ({
			onDragEnd: async (_, activeItem, overItem) => {
				if (activeItem && overItem && activeItem.id !== overItem.id) {
					const newParentId = determineNewParentId(activeItem, overItem);
					const hasParentChanged = activeItem.parent_id !== newParentId;

					if (hasParentChanged) {
						await handleUpdateSection(activeItem.id, { parent_id: newParentId });
					}
				}

				if (pendingParentChange) {
					setPendingParentChange(null);
				}
			},
			onDragOver: (_event, activeSection, overSection) => {
				if (!(activeSection && overSection)) {
					return;
				}

				if (wouldCreateInvalidNesting(activeSection, overSection)) {
					toast.error("Cannot create more than 2 levels of nesting");
				}
			},
			onDragStart: (_event) => {
				if (expandedSectionId !== null) {
					setExpandedSectionId(null);
				}
			},
			onReorder: async (sections, oldIndex, newIndex) => {
				const reorderedSections = arrayMove(sections, oldIndex, newIndex);

				const updatedSections = reorderedSections.map((section, index) => ({
					...section,
					order: index,
					parent_id: section.parent_id ?? null,
				}));

				await useApplicationStore.getState().updateGrantSections(updatedSections.map(toUpdateGrantSection));
			},
		}),
		[
			toUpdateGrantSection,
			wouldCreateInvalidNesting,
			determineNewParentId,
			pendingParentChange,
			expandedSectionId,
			handleUpdateSection,
		],
	);

	const { DragDropWrapper } = useDragAndDrop<GrantSection>(dragHandlers);

	const sortedSections = useMemo(() => [...grantSections].sort((a, b) => a.order - b.order), [grantSections]);

	const mainSections = useMemo(() => sortedSections.filter((section) => !section.parent_id), [sortedSections]);

	const subsectionsByParent = useMemo(
		() =>
			sortedSections.reduce<Record<string, typeof grantSections>>((acc, section) => {
				if (section.parent_id) {
					if (!(section.parent_id in acc)) {
						acc[section.parent_id] = [];
					}
					acc[section.parent_id].push(section);
				}
				return acc;
			}, {}),
		[sortedSections],
	);

	const renderDragOverlay = useCallback((activeSection: GrantSection | undefined) => {
		if (!activeSection) return null;

		return <SectionDragOverlay activeSection={activeSection} />;
	}, []);

	return (
		<DragDropWrapper items={grantSections} renderDragOverlay={renderDragOverlay}>
			<div className="mb-3 space-y-2 p-1">
				{grantSections.length > 0 && (
					<SectionList
						expandedSectionId={expandedSectionId}
						handleAddNewSection={handleAddNewSection}
						handleDeleteSection={handleDeleteSection}
						handleUpdateSection={handleUpdateSection}
						isDetailedSection={isDetailedSection}
						mainSections={mainSections}
						subsectionsByParent={subsectionsByParent}
						toggleSectionExpanded={toggleSectionExpanded}
						toUpdateGrantSection={toUpdateGrantSection}
					/>
				)}
			</div>
		</DragDropWrapper>
	);
}

function SectionDragOverlay({ activeSection }: { activeSection: GrantSection }) {
	const isSubsection = activeSection.parent_id !== null;
	const hasMaxWords = "max_words" in activeSection && Boolean(activeSection.max_words);

	return (
		<div
			className={`group rounded outline-2 outline-offset-[-1px] outline-primary transition-all duration-200 bg-white shadow-xl ${isSubsection ? "ml-[6.875rem] px-3 py-2" : "px-3 py-4"}`}
			style={{ minWidth: isSubsection ? "410px" : "300px" }}
		>
			<div className={`flex items-center justify-start ${isSubsection ? "gap-2" : "gap-5"}`}>
				<div className="relative size-6 cursor-grabbing">
					<GripVertical className="size-6 text-gray-400" />
				</div>

				<div className="flex flex-1 items-center justify-between">
					<div className="flex flex-1 flex-col items-start justify-start">
						<div className="flex w-full items-center justify-start gap-1.5">
							<h3
								className={`${isSubsection ? "font-normal leading-tight" : "font-heading leading-snug"} text-base font-semibold text-app-black`}
							>
								{activeSection.title}
							</h3>
							{hasMaxWords && "max_words" in activeSection && (
								<span className="text-xs font-normal leading-none text-dark-gray">
									{activeSection.max_words.toLocaleString()} Max words
								</span>
							)}
						</div>
					</div>
					<div className="flex items-center justify-end">
						<SectionIconButton className="size-7 opacity-100">
							<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
						</SectionIconButton>

						{!isSubsection && (
							<SectionIconButton className="ml-1 opacity-100">
								<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
							</SectionIconButton>
						)}

						<SectionIconButton className="ml-5">
							<Image
								alt="Collapse"
								className="transition-transform duration-200"
								height={22}
								src="/icons/chevron-down.svg"
								width={22}
							/>
						</SectionIconButton>
					</div>
				</div>
			</div>
		</div>
	);
}

function SectionList({
	expandedSectionId,
	handleAddNewSection,
	handleDeleteSection,
	handleUpdateSection,
	isDetailedSection,
	mainSections,
	subsectionsByParent,
	toggleSectionExpanded,
	toUpdateGrantSection,
}: {
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
} & SectionListProps) {
	// Flatten sections for optimal SortableContext performance
	// Keep efficient data structures while creating flat DOM
	const allSectionsFlattened = useMemo(() => {
		const result: GrantSection[] = [];
		mainSections.forEach((main) => {
			result.push(main);
			const subsections = subsectionsByParent[main.id] ?? [];
			result.push(...subsections);
		});
		return result;
	}, [mainSections, subsectionsByParent]);

	return (
		<div className="space-y-2">
			{allSectionsFlattened.map((section) => (
				<SortableSection
					isDetailedSection={isDetailedSection}
					isDragDisabled={allSectionsFlattened.length === 1}
					isExpanded={expandedSectionId === section.id}
					isSubsection={!!section.parent_id}
					key={section.id}
					onAddSubsection={section.parent_id ? undefined : () => handleAddNewSection(section.id)}
					onDelete={() => handleDeleteSection(section.id, section.parent_id ?? "")}
					onToggleExpand={() => {
						toggleSectionExpanded(section.id);
					}}
					onUpdate={(updates) => handleUpdateSection(section.id, updates)}
					section={section}
					toUpdateGrantSection={toUpdateGrantSection}
				/>
			))}
		</div>
	);
}
