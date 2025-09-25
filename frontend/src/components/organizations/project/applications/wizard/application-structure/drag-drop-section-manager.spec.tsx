import { ApplicationFactory, GrantSectionFactory, GrantTemplateFactory } from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WizardDialogRef } from "@/components/organizations/project/applications/wizard/modal/wizard-dialog";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection } from "@/types/grant-sections";
import { DragDropSectionManager } from "./drag-drop-section-manager";

// Mock the drag overlay store
const mockSetActiveItem = vi.fn();
const mockClearActiveItem = vi.fn();

vi.mock("@/stores/drag-overlay-store", () => ({
	useDragOverlayStore: Object.assign(
		vi.fn(() => ({
			activeItem: null,
			clearActiveItem: mockClearActiveItem,
			setActiveItem: mockSetActiveItem,
		})),
		{
			getState: () => ({
				activeItem: null,
				clearActiveItem: mockClearActiveItem,
				setActiveItem: mockSetActiveItem,
			}),
		},
	),
}));

// Mock @dnd-kit components
vi.mock("@dnd-kit/core", () => ({
	closestCenter: vi.fn(),
	DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
	DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
	KeyboardSensor: vi.fn(),
	PointerSensor: vi.fn(),
	pointerWithin: vi.fn(),
	TouchSensor: vi.fn(),
	useSensor: vi.fn(() => ({})),
	useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
	SortableContext: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sortable-context">{children}</div>
	),
	sortableKeyboardCoordinates: vi.fn(),
	useSortable: vi.fn(() => ({
		active: null,
		attributes: {},
		isDragging: false,
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
	})),
	verticalListSortingStrategy: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		info: vi.fn(),
	},
}));

const mockUpdateGrantSections = vi.fn();
const mockIsDetailedSection = vi.fn((section: GrantSection) => "max_words" in section);

const dialogRef: RefObject<WizardDialogRef> = {
	current: {
		open: vi.fn(),
	} as any,
};

describe("DragDropSectionManager", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateGrantSections.mockResolvedValue(undefined);
		useApplicationStore.getState().updateGrantSections = mockUpdateGrantSections;
	});

	describe("Rendering", () => {
		it("renders sections from the application store", () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null, title: "Main Section 1" }),
				GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1", title: "Sub Section 1" }),
			];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
			expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		});

		it("renders empty state when no sections exist", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: [] }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		});
	});

	describe("Section Management", () => {
		it("adds new section when add button is clicked", () => {
			const existingSections = [GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null })];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: existingSections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			expect(mockUpdateGrantSections).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						order: 0,
						parent_id: null,
						title: "New Section",
					}),
					expect.objectContaining({
						order: 1,
						parent_id: null,
					}),
				]),
			);
		});

		it("handles section deletion", () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
				GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null }),
			];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			const deleteButtons = screen.getAllByTestId("delete-section-button");
			fireEvent.click(deleteButtons[0]);

			expect(dialogRef.current.open).toHaveBeenCalledWith(
				expect.objectContaining({
					title: "Are you sure you want to delete this section?",
				}),
			);
		});

		it("adds subsection to existing section", () => {
			const sections = [GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null })];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			const addSubsectionButtons = screen.getAllByTestId("add-subsection-button");
			fireEvent.click(addSubsectionButtons[0]);

			expect(mockUpdateGrantSections).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						order: 1,
						parent_id: "main-1",
						title: "New Sub-section",
					}),
				]),
			);
		});
	});

	describe("Section Updates", () => {
		it("renders sections correctly", () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null, title: "Test Section" }),
			];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
		});
	});

	describe("Accessibility", () => {
		it("renders add button", () => {
			const sections = [GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null })];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(<DragDropSectionManager dialogRef={dialogRef} isDetailedSection={mockIsDetailedSection} />);

			expect(screen.getByTestId("add-new-section-button")).toBeInTheDocument();
		});
	});
});
