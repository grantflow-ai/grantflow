import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import { SortableSection } from "@/components/projects/wizard/grant-sections";
import { SectionIconButton } from "@/components/projects/wizard/section-icon-button";
import { useApplicationStore } from "@/stores/application-store";
import type { API } from "@/types/api-types";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";

interface SectionListProps {
	expandedSections: Set<string>;
	grantSections: GrantSection[];
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
	const { application, updateGrantSections } = useApplicationStore();
	const [activeId, setActiveId] = useState<null | string>(null);
	const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

	const grantSections = application?.grant_template?.grant_sections ?? [];

	const toggleSectionExpanded = useCallback((sectionId: string) => {
		setExpandedSections((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(sectionId)) {
				newSet.delete(sectionId);
			} else {
				newSet.add(sectionId);
			}
			return newSet;
		});
	}, []);

	const collapseSections = useCallback((sectionId: string) => {
		setExpandedSections((prev) => {
			const newSet = new Set(prev);
			newSet.delete(sectionId);
			return newSet;
		});
	}, []);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

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
			collapseSections(sectionId);
		},
		[grantSections, updateGrantSections, collapseSections, toUpdateGrantSection],
	);

	const handleAddNewSection = useCallback(
		async (parentId: null | string = null) => {
			await onAddSection(parentId);
		},
		[onAddSection],
	);

	const handleDragStart = useCallback((event: DragStartEvent) => {
		setActiveId(event.active.id as string);
	}, []);

	const handleDragEnd = useCallback(
		async (event: DragEndEvent) => {
			const { active, over } = event;
			setActiveId(null);

			if (!over || active.id === over.id) {
				return;
			}

			const sections = [...grantSections];
			const activeSection = sections.find((s) => s.id === active.id);
			const overSection = sections.find((s) => s.id === over.id);

			if (!(activeSection && overSection)) {
				return;
			}

			const oldIndex = sections.findIndex((s) => s.id === active.id);
			const newIndex = sections.findIndex((s) => s.id === over.id);

			const reorderedSections = arrayMove(sections, oldIndex, newIndex);

			const updatedSections = reorderedSections.map((section, index) => ({
				...section,
				order: index,
				parent_id: section.parent_id ?? null,
			}));

			await updateGrantSections(updatedSections.map(toUpdateGrantSection));
		},
		[grantSections, updateGrantSections, toUpdateGrantSection],
	);

	const handleDragOver = useCallback(
		async (event: DragOverEvent) => {
			const { active, over } = event;

			if (!over || active.id === over.id) {
				return;
			}

			const sections = [...grantSections];
			const activeSection = sections.find((s) => s.id === active.id);
			const overSection = sections.find((s) => s.id === over.id);

			if (!(activeSection && overSection)) {
				return;
			}

			const activeIsChild = activeSection.parent_id !== null;
			const overIsChild = overSection.parent_id !== null;

			if (activeIsChild !== overIsChild) {
				const updatedSections = sections.map((section) => {
					if (section.id === activeSection.id) {
						return {
							...section,
							parent_id: overIsChild ? overSection.parent_id : null,
						};
					}
					return section;
				});

				await updateGrantSections(updatedSections as API.UpdateGrantTemplate.RequestBody["grant_sections"]);
			}
		},
		[grantSections, updateGrantSections],
	);

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

	const activeSection = useMemo(() => grantSections.find((s) => s.id === activeId), [grantSections, activeId]);

	return (
		<DndContext
			collisionDetection={closestCenter}
			onDragEnd={handleDragEnd}
			onDragOver={handleDragOver}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<div className="mb-3 space-y-2 p-2">
				{grantSections.length > 0 && (
					<SectionList
						expandedSections={expandedSections}
						grantSections={grantSections}
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
			<SectionDragOverlay
				activeId={activeId}
				activeSection={activeSection}
				isDetailedSection={isDetailedSection}
			/>
		</DndContext>
	);
}

function SectionDragOverlay({
	activeId,
	activeSection,
	isDetailedSection,
}: {
	activeId: null | string;
	activeSection: GrantSection | undefined;
	isDetailedSection: (section: GrantSection) => boolean;
}) {
	if (!(activeId && activeSection)) {
		return <DragOverlay />;
	}

	const isSubsection = activeSection.parent_id !== null;
	const detailedSection = isDetailedSection(activeSection) ? activeSection : null;
	const maxWords =
		detailedSection && "max_words" in detailedSection && typeof detailedSection.max_words === "number"
			? detailedSection.max_words
			: null;

	return (
		<DragOverlay>
			<div
				className={`flex items-center justify-start gap-5 rounded bg-white shadow-lg outline-1 outline-offset-[-1px] outline-blue-500 hover:outline-2 ${isSubsection ? "ml-[6.875rem] px-2 py-3" : "px-3 py-4"}`}
			>
				<div className="relative size-6 cursor-move ">
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
		</DragOverlay>
	);
}

function SectionList({
	expandedSections,
	grantSections,
	handleAddNewSection,
	handleDeleteSection,
	handleUpdateSection,
	isDetailedSection,
	mainSections,
	subsectionsByParent,
	toggleSectionExpanded,
	toUpdateGrantSection,
}: SectionListProps) {
	const sortableContextItems = useMemo(() => grantSections.map((s) => s.id), [grantSections]);

	return (
		<SortableContext items={sortableContextItems} strategy={verticalListSortingStrategy}>
			{mainSections.map((section) => (
				<div className="space-y-2" key={section.id}>
					<SortableSection
						isDetailedSection={isDetailedSection}
						isExpanded={expandedSections.has(section.id)}
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
							isExpanded={expandedSections.has(subsection.id)}
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
		</SortableContext>
	);
}
