import { arrayMove } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { type DragDropHandlers, useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import { log } from "@/utils/logger";
import { SortableSection } from "./grant-sections";
import { SectionIconButton } from "./section-icon-button";

interface SectionListProps {
	expandedSectionId: null | string;
	handleAddNewSection: (parentId?: null | string) => Promise<void>;
	handleDeleteSection: (sectionId: string) => Promise<void>;
	handleUpdateSection: (sectionId: string, updates: Partial<GrantSection>) => Promise<void>;
	isDetailedSection: (section: GrantSection) => boolean;
	mainSections: GrantSection[];
	subsectionsByParent: Record<string, GrantSection[]>;
	toggleSectionExpanded: (sectionId: string) => void;
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
}

export function DragDropSectionManager({
	isDetailedSection,
	onAddSection,
	toUpdateGrantSection,
}: {
	isDetailedSection: (section: GrantSection) => boolean;
	onAddSection: (parentId?: null | string) => Promise<void>;
	toUpdateGrantSection: (section: GrantSection) => UpdateGrantSection;
}) {
	const application = useApplicationStore((state) => state.application);
	const updateGrantSections = useApplicationStore((state) => state.updateGrantSections);
	const [expandedSectionId, setExpandedSectionId] = useState<null | string>(null);

	const grantSections = application?.grant_template?.grant_sections ?? [];

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
		const activeIsChild = activeSection.parent_id !== null;
		const overIsChild = overSection.parent_id !== null;

		if (overIsChild) {
			return overSection.parent_id;
		}

		if (activeIsChild) {
			return overSection.id;
		}

		return null;
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
			await updateGrantSections(updatedSections);
		},
		[grantSections, updateGrantSections, toUpdateGrantSection],
	);

	const handleDeleteSection = useCallback(
		async (sectionId: string) => {
			const updatedSections = grantSections
				.filter((section) => section.id !== sectionId)
				.map(toUpdateGrantSection);
			await updateGrantSections(updatedSections);
			setExpandedSectionId((prev) => (prev === sectionId ? null : prev));
		},
		[grantSections, updateGrantSections, toUpdateGrantSection],
	);

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const dragHandlers: DragDropHandlers<GrantSection> = useMemo(
		() => ({
			onDragEnd: (event, activeItem, overItem) => {
				log.info("Drag ended", {
					activeId: activeItem?.id,
					activeTitle: activeItem?.title,
					eventActive: event.active.id,
					eventOver: event.over?.id,
					overId: overItem?.id,
					overTitle: overItem?.title,
				});
			},
			onDragOver: async (_event, activeSection, overSection) => {
				if (!(activeSection && overSection)) {
					// log.warn("Drag over: Missing active or over section");
					return;
				}

				if (wouldCreateInvalidNesting(activeSection, overSection)) {
					log.warn("Drag over: Would create invalid nesting", {
						activeId: activeSection.id,
						overId: overSection.id,
					});
					toast.error("Cannot create more than 2 levels of nesting");
					return;
				}

				const newParentId = determineNewParentId(activeSection, overSection);
				log.info("Drag over: Determined new parent", {
					activeId: activeSection.id,
					newParentId,
					oldParentId: activeSection.parent_id,
				});

				if (activeSection.parent_id !== newParentId) {
					const updatedSections = grantSections.map((section) => {
						if (section.id === activeSection.id) {
							return toUpdateGrantSection({
								...section,
								parent_id: newParentId,
							});
						}
						return toUpdateGrantSection(section);
					});

					log.info("Drag over: Updating sections", { sectionCount: updatedSections.length });
					await updateGrantSections(updatedSections);
				}
			},
			onDragStart: (_event, item) => {
				log.info("Drag started", { sectionId: item?.id, sectionTitle: item?.title });
			},
			onReorder: async (sections, oldIndex, newIndex) => {
				log.info("Reordering sections", { newIndex, oldIndex, sectionCount: sections.length });

				const reorderedSections = arrayMove(sections, oldIndex, newIndex);

				const updatedSections = reorderedSections.map((section, index) => ({
					...section,
					order: index,
					parent_id: section.parent_id ?? null,
				}));

				log.info("Reorder: Updating grant sections", {
					sections: updatedSections.map((s) => ({ id: s.id, order: s.order, title: s.title })),
					updatedCount: updatedSections.length,
				});
				await updateGrantSections(updatedSections.map(toUpdateGrantSection));
			},
		}),
		[grantSections, updateGrantSections, toUpdateGrantSection, wouldCreateInvalidNesting, determineNewParentId],
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

	const renderDragOverlay = useCallback(
		(activeSection: GrantSection | undefined) => {
			if (!activeSection) return null;

			return <SectionDragOverlay activeSection={activeSection} isDetailedSection={isDetailedSection} />;
		},
		[isDetailedSection],
	);

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

function SectionDragOverlay({
	activeSection,
	isDetailedSection,
}: {
	activeSection: GrantSection;
	isDetailedSection: (section: GrantSection) => boolean;
}) {
	const isSubsection = activeSection.parent_id !== null;
	const detailedSection = isDetailedSection(activeSection) ? activeSection : null;
	const maxWords =
		detailedSection && "max_words" in detailedSection && typeof detailedSection.max_words === "number"
			? detailedSection.max_words
			: null;

	return (
		<div
			className={`flex items-center justify-start gap-5 rounded bg-white shadow-2xl border-2 border-blue-500 opacity-90 ${isSubsection ? "ml-[6.875rem] px-2 py-3" : "px-3 py-4"}`}
			style={{ minWidth: "300px" }}
		>
			<div className="relative size-6 cursor-grabbing">
				<GripVertical className="size-6 text-gray-400" />
			</div>

			<div className="flex flex-1 items-center justify-between ">
				<div className="flex flex-1 flex-col items-start justify-start ">
					<div className="flex w-full items-center justify-start gap-2 ">
						<h3 className=" text-base font-medium text-gray-900">{activeSection.title}</h3>
						{maxWords && (
							<span className=" text-sm font-normal text-gray-500">
								{maxWords.toLocaleString()} Max words
							</span>
						)}
					</div>
				</div>
				<div className="flex items-center justify-end ">
					<SectionIconButton>
						<Image alt="Delete" height={24} src="/icons/delete.svg" width={24} />
					</SectionIconButton>

					{!isSubsection && (
						<SectionIconButton className="ml-1">
							<Image alt="Add" height={20} src="/icons/plus.svg" width={20} />
						</SectionIconButton>
					)}

					<SectionIconButton className="ml-5">
						<Image alt="Expand" height={22} src="/icons/chevron-down.svg" width={22} />
					</SectionIconButton>
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
}: SectionListProps) {
	return (
		<>
			{mainSections.map((section) => (
				<div className="space-y-2" key={section.id}>
					<SortableSection
						isDetailedSection={isDetailedSection}
						isExpanded={expandedSectionId === section.id}
						onAddSubsection={() => handleAddNewSection(section.id)}
						onDelete={() => handleDeleteSection(section.id)}
						onToggleExpand={() => {
							toggleSectionExpanded(section.id);
						}}
						onUpdate={(updates) => handleUpdateSection(section.id, updates)}
						section={section}
						toUpdateGrantSection={toUpdateGrantSection}
					/>
					{(subsectionsByParent[section.id] ?? []).map((subsection) => (
						<SortableSection
							isDetailedSection={isDetailedSection}
							isExpanded={expandedSectionId === subsection.id}
							isSubsection
							key={subsection.id}
							onDelete={() => handleDeleteSection(subsection.id)}
							onToggleExpand={() => {
								toggleSectionExpanded(subsection.id);
							}}
							onUpdate={(updates) => handleUpdateSection(subsection.id, updates)}
							section={subsection}
							toUpdateGrantSection={toUpdateGrantSection}
						/>
					))}
				</div>
			))}
		</>
	);
}
