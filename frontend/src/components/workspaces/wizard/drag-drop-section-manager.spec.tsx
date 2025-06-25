import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("DragDropSectionManager", () => {
	const mockUpdateGrantSections = vi.fn();
	const mockOnAddSection = vi.fn();
	const mockIsDetailedSection = vi.fn(() => true);
	const mockToUpdateGrantSection = vi.fn((section) => section);

	const defaultProps = {
		isDetailedSection: mockIsDetailedSection,
		onAddSection: mockOnAddSection,
		toUpdateGrantSection: mockToUpdateGrantSection,
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

	describe("rendering", () => {
		it("renders DndContext with proper configuration", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const dndContext = screen.getByTestId("dnd-context");
			expect(dndContext).toBeInTheDocument();
			expect(dndContext).toHaveAttribute("data-drag-end", "enabled");
			expect(dndContext).toHaveAttribute("data-drag-over", "enabled");
			expect(dndContext).toHaveAttribute("data-drag-start", "enabled");
		});

		it("renders SortableContext", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
		});

		it("renders main sections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionTitles = screen.getAllByTestId("section-title");

			expect(sectionTitles[0]).toHaveTextContent("Main Section 1");
			expect(sectionTitles[1]).toHaveTextContent("Subsection 1");
			expect(sectionTitles[2]).toHaveTextContent("Main Section 2");
		});

		it("renders subsections under their parent sections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionTitles = screen.getAllByTestId("section-title");

			expect(sectionTitles[1]).toHaveTextContent("Subsection 1");
		});

		it("does not render anything when no sections exist", () => {
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

	describe("section interactions", () => {
		it("handles section deletion", async () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const deleteButtons = screen.getAllByTestId("delete-section-button");
			fireEvent.click(deleteButtons[0]);

			expect(mockUpdateGrantSections).toHaveBeenCalledWith([
				expect.objectContaining({ id: "section-2" }),
				expect.objectContaining({ id: "subsection-1" }),
			]);
		});

		it("handles section expansion toggle", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const expandButtons = screen.getAllByTestId("expand-section-button");
			fireEvent.click(expandButtons[0]);

			expect(screen.getByTestId("edit-form-header")).toBeInTheDocument();
		});

		it("handles adding new sections", async () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const addSubButtons = screen.getAllByTestId("add-subsection-button");
			fireEvent.click(addSubButtons[0]);

			expect(mockOnAddSection).toHaveBeenCalledWith("section-1");
		});
	});

	describe("section organization", () => {
		it("properly separates main sections and subsections", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			const sectionTitles = screen.getAllByTestId("section-title");
			expect(sectionTitles).toHaveLength(3);

			expect(sectionTitles[0]).toHaveTextContent("Main Section 1");
			expect(sectionTitles[1]).toHaveTextContent("Subsection 1");
			expect(sectionTitles[2]).toHaveTextContent("Main Section 2");
		});

		it("sorts sections by order", () => {
			const unorderedSections = [
				GrantSectionDetailedFactory.build({
					id: "section-z",
					order: 2,
					parent_id: null,
					title: "Last Section",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-a",
					order: 0,
					parent_id: null,
					title: "First Section",
				}),
				GrantSectionDetailedFactory.build({
					id: "section-m",
					order: 1,
					parent_id: null,
					title: "Middle Section",
				}),
			];

			useApplicationStore.setState({
				application: ApplicationWithTemplateFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: unorderedSections }),
				}),
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			const sectionTitles = screen.getAllByTestId("section-title");
			expect(sectionTitles[0]).toHaveTextContent("First Section");
			expect(sectionTitles[1]).toHaveTextContent("Middle Section");
			expect(sectionTitles[2]).toHaveTextContent("Last Section");
		});
	});

	describe("drag overlay", () => {
		it("renders drag overlay", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
		});

		it("shows section details in drag overlay when dragging", () => {
			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
		});
	});

	describe("edge cases", () => {
		it("handles empty grant sections array", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: [] }),
				}),
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.queryByTestId("section-title")).not.toBeInTheDocument();
		});

		it("handles missing grant template", () => {
			useApplicationStore.setState({
				application: ApplicationFactory.build({ grant_template: undefined }),
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.queryByTestId("section-title")).not.toBeInTheDocument();
		});

		it("handles sections with no parent_id correctly", () => {
			const sectionsWithNullParent = [
				GrantSectionDetailedFactory.build({
					id: "section-1",
					order: 0,
					parent_id: null,
					title: "Main Section",
				}),
			];

			useApplicationStore.setState({
				application: ApplicationWithTemplateFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sectionsWithNullParent }),
				}),
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<DragDropSectionManager {...defaultProps} />);

			expect(screen.getByText("Main Section")).toBeInTheDocument();
		});
	});

	describe("prop handling", () => {
		it("passes isDetailedSection function to child components", () => {
			const customIsDetailedSection = vi.fn(() => false);

			render(<DragDropSectionManager {...defaultProps} isDetailedSection={customIsDetailedSection} />);

			expect(screen.getByText("Main Section 1")).toBeInTheDocument();
		});

		it("passes toUpdateGrantSection function to child components", () => {
			const customToUpdateGrantSection = vi.fn((section) => ({ ...section, custom: true }));

			render(<DragDropSectionManager {...defaultProps} toUpdateGrantSection={customToUpdateGrantSection} />);

			expect(screen.getByText("Main Section 1")).toBeInTheDocument();
		});

		it("handles onAddSection callback correctly", async () => {
			const customOnAddSection = vi.fn();

			render(<DragDropSectionManager {...defaultProps} onAddSection={customOnAddSection} />);

			const addSubButtons = screen.getAllByTestId("add-subsection-button");
			fireEvent.click(addSubButtons[0]);

			expect(customOnAddSection).toHaveBeenCalledWith("section-1");
		});
	});
});
