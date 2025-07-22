import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { DragDropSectionManager } from "./drag-drop-section-manager";

vi.mock("@dnd-kit/core", () => ({
	closestCenter: vi.fn(),
	DndContext: ({ children, onDragEnd, onDragOver, onDragStart }: any) => (
		<div
			data-drag-end={onDragEnd ? "enabled" : "disabled"}
			data-drag-over={onDragOver ? "enabled" : "disabled"}
			data-drag-start={onDragStart ? "enabled" : "disabled"}
			data-testid="dnd-context"
		>
			{children}
		</div>
	),
	DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
	KeyboardSensor: vi.fn(),
	PointerSensor: vi.fn(),
	useSensor: vi.fn(),
	useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
	arrayMove: vi.fn((array, oldIndex, newIndex) => {
		const newArray = [...array];
		const [removed] = newArray.splice(oldIndex, 1);
		newArray.splice(newIndex, 0, removed);
		return newArray;
	}),
	SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
	sortableKeyboardCoordinates: vi.fn(),
	useSortable: vi.fn(() => ({
		attributes: {},
		isDragging: false,
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
	})),
	verticalListSortingStrategy: vi.fn(),
}));

vi.mock("next/image", () => ({
	default: ({ alt, className, src }: { alt: string; className?: string; src: string }) => (
		<div className={className} data-src={src} data-testid={`image-${alt}`} />
	),
}));

afterEach(() => {
	cleanup();
});

describe.sequential("DragDropSectionManager", () => {
	const mockUpdateGrantSections = vi.fn();
	const mockOnAddSection = vi.fn();
	const mockIsDetailedSection = vi.fn(() => true);
	const mockDialogRef = { current: { close: vi.fn(), open: vi.fn() } };

	const defaultProps = {
		dialogRef: mockDialogRef,
		isDetailedSection: mockIsDetailedSection,
		onAddSection: mockOnAddSection,
	};

	const mockApplication = ApplicationWithTemplateFactory.build({
		grant_template: GrantTemplateFactory.build({
			grant_sections: [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: null,
					title: "Main Section 1",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-2",
					order: 1,
					parent_id: null,
					title: "Main Section 2",
				}),
				GrantSectionDetailedFactory.build({
					id: "subsection-1",
					order: 2,
					parent_id: "section-1",
					title: "Subsection 1",
				}),
			],
		}),
	});

	beforeEach(() => {
		vi.clearAllMocks();
		useApplicationStore.setState({
			application: mockApplication,
			updateGrantSections: mockUpdateGrantSections,
		});
	});

	afterEach(() => {
		cleanup();
	});

	describe("basic rendering", () => {
		it("renders drag and drop infrastructure", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
			expect(screen.getAllByTestId("sortable-context").length).toBeGreaterThan(0);
		});

		it("renders sections with interactive elements", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getAllByTestId("section-title").length).toBeGreaterThan(0);

			expect(screen.getAllByTestId("delete-section-button").length).toBeGreaterThan(0);
			expect(screen.getAllByTestId("expand-section-button").length).toBeGreaterThan(0);
		});
	});

	describe("header click functionality", () => {
		it("allows clicking on section headers to expand", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionHeaders = screen.getAllByRole("button", {
				name: /expand.*section/i,
			});
			expect(sectionHeaders.length).toBeGreaterThan(0);

			fireEvent.click(sectionHeaders[0]);

			const editForm = screen.queryByTestId(/edit-form-header/);
			expect(editForm).toBeInTheDocument();
		});

		it("supports keyboard navigation for headers", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionHeaders = screen.getAllByRole("button", {
				name: /expand.*section/i,
			});

			fireEvent.keyDown(sectionHeaders[0], { key: "Enter" });
			expect(screen.queryByTestId(/edit-form-header/)).toBeInTheDocument();
		});

		it("blocks clicks on interactive elements from expanding sections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const initialEditForms = screen.queryAllByTestId(/edit-form-header/);
			const initialCount = initialEditForms.length;

			const deleteButtons = screen.getAllByTestId("delete-section-button");
			fireEvent.click(deleteButtons[0]);

			const afterClickEditForms = screen.queryAllByTestId(/edit-form-header/);
			expect(afterClickEditForms.length).toBe(initialCount);
		});

		it("expands section when clicking on section title", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionTitles = screen.getAllByTestId("section-title");
			const [firstSectionTitle] = sectionTitles;

			fireEvent.click(firstSectionTitle);

			expect(screen.queryByTestId(/edit-form-header/)).toBeInTheDocument();
		});

		it("validates that header elements have correct attributes for click detection", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionHeaders = screen.getAllByRole("button", {
				name: /expand.*section/i,
			});
			expect(sectionHeaders.length).toBeGreaterThan(0);

			const [headerElement] = sectionHeaders;
			expect(headerElement).toHaveAttribute("data-header", "true");
			expect(headerElement).toHaveAttribute("role", "button");
			expect(headerElement).toHaveAttribute("tabIndex", "0");
			expect(headerElement).toHaveAttribute("aria-label");

			const dragHandles = screen
				.getAllByTestId("section-container")[0]
				.querySelectorAll('[data-interactive="true"]');
			expect(dragHandles.length).toBeGreaterThan(0);
			expect(dragHandles[0]).toHaveAttribute("data-interactive", "true");
		});
	});

	describe("drag behavior enhancements", () => {
		it("configures drag handlers properly", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const dndContexts = screen.getAllByTestId("dnd-context");
			const [dndContext] = dndContexts;
			expect(dndContext).toHaveAttribute("data-drag-start", "enabled");
			expect(dndContext).toHaveAttribute("data-drag-over", "enabled");
			expect(dndContext).toHaveAttribute("data-drag-end", "enabled");
		});

		it("renders drag overlay for sections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getAllByTestId("drag-overlay").length).toBeGreaterThan(0);
		});
	});

	describe("section management", () => {
		it("shows confirmation dialog for main section deletion", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const deleteButtons = screen.getAllByTestId("delete-section-button");
			fireEvent.click(deleteButtons[0]); // This should be a main section

			// Check that dialog.open was called instead of immediate deletion
			expect(mockDialogRef.current.open).toHaveBeenCalled();
			expect(mockUpdateGrantSections).not.toHaveBeenCalled();
		});

		it("immediately deletes sub-sections without confirmation", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const deleteButtons = screen.getAllByTestId("delete-section-button");
			// Find the delete button for the sub-section (subsection-1 has parent_id: "section-1")
			// Based on flattened rendering: [0] section-1, [1] subsection-1, [2] section-2
			const [, subSectionDeleteButton] = deleteButtons; // Second button is for subsection-1
			fireEvent.click(subSectionDeleteButton);

			// Sub-sections should be deleted immediately without dialog
			expect(mockDialogRef.current.open).not.toHaveBeenCalled();
			expect(mockUpdateGrantSections).toHaveBeenCalled();
		});

		it("handles adding subsections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const addButtons = screen.getAllByTestId("add-subsection-button");
			fireEvent.click(addButtons[0]);

			expect(mockOnAddSection).toHaveBeenCalled();
		});

		it("shows expand/collapse buttons", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const expandButtons = screen.getAllByTestId("expand-section-button");
			expect(expandButtons.length).toBeGreaterThan(0);

			fireEvent.click(expandButtons[0]);
			expect(screen.queryByTestId(/edit-form-header/)).toBeInTheDocument();
		});
	});

	describe("drag and drop logic", () => {
		it("verifies drag handlers are configured", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sections = mockApplication.grant_template!.grant_sections;
			const mainSection = sections.find((s) => s.id === "section-2");
			const subsection = sections.find((s) => s.id === "subsection-1");

			expect(mainSection).toBeDefined();
			expect(subsection).toBeDefined();

			const dndContexts = screen.getAllByTestId("dnd-context");
			expect(dndContexts.length).toBeGreaterThan(0);

			const [firstContext] = dndContexts;
			expect(firstContext.dataset.dragEnd).toBe("enabled");
			expect(firstContext.dataset.dragStart).toBe("enabled");
			expect(firstContext.dataset.dragOver).toBe("enabled");
		});

		it("renders sections with correct structure", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sections = mockApplication.grant_template!.grant_sections;
			const subsection1 = sections.find((s) => s.id === "subsection-1");

			expect(subsection1).toBeDefined();

			const sectionTitles = screen.getAllByTestId("section-title");
			const sectionContainers = screen.getAllByTestId("section-container");

			expect(sectionTitles.length).toBeGreaterThan(0);
			expect(sectionContainers.length).toBeGreaterThan(0);

			expect(sectionTitles.some((title) => title.textContent?.includes("Main Section 1"))).toBe(true);
			expect(sectionTitles.some((title) => title.textContent?.includes("Subsection 1"))).toBe(true);
		});

		it("handles section interactions", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sections = mockApplication.grant_template!.grant_sections;
			const section = sections.find((s) => s.id === "section-1");

			expect(section).toBeDefined();

			const expandButtons = screen.getAllByTestId("expand-section-button");
			const deleteButtons = screen.getAllByTestId("delete-section-button");

			expect(expandButtons.length).toBeGreaterThan(0);
			expect(deleteButtons.length).toBeGreaterThan(0);

			expect(expandButtons.length).toBe(deleteButtons.length);
		});
	});

	describe("edge cases", () => {
		it("handles empty sections gracefully", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: [] }),
				}),
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.queryByTestId("section-title")).not.toBeInTheDocument();
		});

		it("handles null application gracefully", () => {
			useApplicationStore.setState({
				application: null,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.queryByTestId("section-title")).not.toBeInTheDocument();
		});
	});
});
