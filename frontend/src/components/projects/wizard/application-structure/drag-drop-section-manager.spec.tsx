import {
	ApplicationFactory,
	ApplicationWithTemplateFactory,
	GrantSectionDetailedFactory,
	GrantTemplateFactory,
} from "::testing/factories";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useApplicationStore } from "@/stores/application-store";
import { ApplicationStructureStep } from "./application-structure-step";
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

	describe("Section Management", () => {
		it("handles add new section button click", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
					id: "template-id",
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith([
					expect.objectContaining({
						depends_on: [],
						generation_instructions: "",
						id: expect.stringMatching(/^section-/),
						is_clinical_trial: null,
						is_detailed_research_plan: null,
						keywords: [],
						max_words: 3000,
						order: 0,
						parent_id: null,
						search_queries: [],
						title: "Category Name",
						topics: [],
					}),
				]);
			});
		});

		it("creates main section with correct title", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith([
					expect.objectContaining({
						parent_id: null,
						title: "Category Name",
					}),
				]);
			});
		});

		it("assigns correct order to new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const existingSections = [
				GrantSectionDetailedFactory.build({ order: 0 }),
				GrantSectionDetailedFactory.build({ order: 1 }),
				GrantSectionDetailedFactory.build({ order: 2 }),
			];

			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
				const [[calledWith]] = mockUpdateGrantSections.mock.calls;
				expect(calledWith).toHaveLength(4);

				expect(calledWith[3]).toEqual(
					expect.objectContaining({
						order: 3,
					}),
				);
			});
		});

		it("preserves existing sections when adding new one", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const existingSections = [
				GrantSectionDetailedFactory.build({
					id: "keep-1",
					title: "Keep This Section",
				}),
				GrantSectionDetailedFactory.build({
					id: "keep-2",
					title: "Keep This Too",
				}),
			];

			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: existingSections,
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				const [[calledWith]] = mockUpdateGrantSections.mock.calls;
				expect(calledWith).toHaveLength(3);
				expect(calledWith[0]).toEqual(
					expect.objectContaining({
						id: "keep-1",
						title: "Keep This Section",
					}),
				);
				expect(calledWith[1]).toEqual(
					expect.objectContaining({
						id: "keep-2",
						title: "Keep This Too",
					}),
				);
				expect(calledWith[2]).toEqual(
					expect.objectContaining({
						title: "Category Name",
					}),
				);
			});
		});

		it("handles empty grant sections array", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalledWith([
					expect.objectContaining({
						order: 0,
						parent_id: null,
						title: "Category Name",
					}),
				]);
			});
		});

		it("generates unique IDs for new sections", async () => {
			const mockUpdateGrantSections = vi.fn().mockResolvedValue(undefined);
			const application = ApplicationFactory.build({
				grant_template: GrantTemplateFactory.build({
					grant_sections: [],
				}),
			});

			useApplicationStore.setState({
				application,
				updateGrantSections: mockUpdateGrantSections,
			});

			render(<ApplicationStructureStep />);

			const addButton = screen.getByTestId("add-new-section-button");
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[firstCall]] = mockUpdateGrantSections.mock.calls;
			const [firstSection] = firstCall;
			const firstCallId = firstSection.id;

			mockUpdateGrantSections.mockClear();
			fireEvent.click(addButton);

			await waitFor(() => {
				expect(mockUpdateGrantSections).toHaveBeenCalled();
			});

			const [[secondCall]] = mockUpdateGrantSections.mock.calls;
			const [secondSection] = secondCall;
			const secondCallId = secondSection.id;

			expect(firstCallId).not.toBe(secondCallId);
			expect(firstCallId).toMatch(/^section-/);
			expect(secondCallId).toMatch(/^section-/);
		});
	});
});