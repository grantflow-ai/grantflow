import { ApplicationFactory, GrantSectionFactory, GrantTemplateFactory } from "::testing/factories";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { RefObject } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDragAndDrop } from "@/hooks/use-drag-and-drop";
import { useApplicationStore } from "@/stores/application-store";
import type { GrantSection, UpdateGrantSection } from "@/types/grant-sections";
import type { WizardDialogRef } from "../shared/wizard-dialog";
import { DragDropSectionManager } from "./drag-drop-section-manager";

vi.mock("@/hooks/use-drag-and-drop", () => ({
	useDragAndDrop: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		info: vi.fn(),
	},
}));

const mockUseDragAndDrop = vi.mocked(useDragAndDrop);
const mockUpdateGrantSections = vi.fn();
const mockOnAddSection = vi.fn();
const mockIsDetailedSection = vi.fn((section: GrantSection) => "max_words" in section);

interface DragDropHandlers<T> {
	onDragEnd: (event: any) => void;
	onDragOver: (event: any, activeItem: T | undefined, overItem: T | undefined) => void;
	onDragStart: (event: any) => void;
	onReorder: (sections: T[], activeIndex: number, overIndex: number, activeItem: T, overItem: T) => Promise<void>;
}

describe("DragDropSectionManager - Outcome-Based Tests", () => {
	let dialogRef: RefObject<WizardDialogRef>;
	let dragHandlers: DragDropHandlers<GrantSection>;

	beforeEach(() => {
		vi.clearAllMocks();

		dialogRef = {
			current: {
				close: vi.fn(),
				open: vi.fn(),
			},
		};

		mockUseDragAndDrop.mockImplementation((handlers) => {
			dragHandlers = handlers as any;
			return {
				activeItem: undefined,
				DragDropWrapper: ({ children }: { children: React.ReactNode }) => (
					<div data-testid="drag-drop-wrapper">{children}</div>
				),
				isItemDragging: vi.fn(() => false),
			};
		});

		mockUpdateGrantSections.mockResolvedValue(undefined);
		mockOnAddSection.mockResolvedValue(undefined);
		useApplicationStore.getState().updateGrantSections = mockUpdateGrantSections;
	});

	describe("Section CRUD Outcomes", () => {
		describe("Adding Sections", () => {
			it("adds main section at the end of the list", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await mockOnAddSection(null);

				expect(mockOnAddSection).toHaveBeenCalledWith(null);
			});

			it("adds subsection under the correct parent", async () => {
				const sections = [GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null })];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await mockOnAddSection("main-1");

				expect(mockOnAddSection).toHaveBeenCalledWith("main-1");
			});
		});

		describe("Deleting Sections", () => {
			it("removes only the targeted subsection", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-1" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const deleteButtons = screen.getAllByTestId("delete-section-button");
				fireEvent.click(deleteButtons[1]); // Delete sub-1

				await waitFor(() => {
					expect(mockUpdateGrantSections).toHaveBeenCalled();
				});

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				expect(updatedSections).toHaveLength(2);
				expect(updatedSections.find((s: UpdateGrantSection) => s.id === "sub-1")).toBeUndefined();
				expect(updatedSections.find((s: UpdateGrantSection) => s.id === "sub-2")).toBeDefined();
			});

			it("removes main section and all its subsections after confirmation", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "main-2", order: 3, parent_id: null }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const [deleteButton] = screen.getAllByTestId("delete-section-button");
				fireEvent.click(deleteButton);

				expect(dialogRef.current.open).toHaveBeenCalledWith(
					expect.objectContaining({
						description: expect.stringContaining("sub-sections"),
						title: "Are you sure you want to delete this section?",
					}),
				);

				const [[dialogOptions]] = vi.mocked(dialogRef.current.open).mock.calls;
				const [, confirmButton] = (dialogOptions as any).footer.props.children;
				await confirmButton.props.onClick();

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				expect(updatedSections).toHaveLength(1);
				expect(updatedSections[0].id).toBe("main-2");
			});

			it("recalculates order after deleting subsection", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-3", order: 3, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "main-2", order: 4, parent_id: null }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const deleteButtons = screen.getAllByTestId("delete-section-button");
				fireEvent.click(deleteButtons[2]); // Delete sub-2 (middle subsection)

				await waitFor(() => {
					expect(mockUpdateGrantSections).toHaveBeenCalled();
				});

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				expect(updatedSections).toHaveLength(4);

				expect(updatedSections.find((s: UpdateGrantSection) => s.id === "sub-2")).toBeUndefined();

				const sortedSections = updatedSections.sort(
					(a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order,
				);
				expect(sortedSections[0].id).toBe("main-1");
				expect(sortedSections[0].order).toBe(0);
				expect(sortedSections[1].id).toBe("sub-1");
				expect(sortedSections[1].order).toBe(1);
				expect(sortedSections[2].id).toBe("sub-3");
				expect(sortedSections[2].order).toBe(2);
				expect(sortedSections[3].id).toBe("main-2");
				expect(sortedSections[3].order).toBe(3);
			});

			it("recalculates order after deleting main section with subsections", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "main-2", order: 2, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-2", order: 3, parent_id: "main-2" }),
					GrantSectionFactory.build({ id: "main-3", order: 4, parent_id: null }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const [deleteButton] = screen.getAllByTestId("delete-section-button");
				fireEvent.click(deleteButton); // Delete main-1 and its subsection

				expect(dialogRef.current.open).toHaveBeenCalledWith(
					expect.objectContaining({
						description: expect.stringContaining("sub-sections"),
						title: "Are you sure you want to delete this section?",
					}),
				);

				const [[dialogOptions]] = vi.mocked(dialogRef.current.open).mock.calls;
				const [, confirmButton] = (dialogOptions as any).footer.props.children;
				await confirmButton.props.onClick();

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				expect(updatedSections).toHaveLength(3);

				const sortedSections = updatedSections.sort(
					(a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order,
				);
				expect(sortedSections[0].id).toBe("main-2");
				expect(sortedSections[0].order).toBe(0);
				expect(sortedSections[1].id).toBe("sub-2");
				expect(sortedSections[1].order).toBe(1);
				expect(sortedSections[2].id).toBe("main-3");
				expect(sortedSections[2].order).toBe(2);
			});
		});

		describe("Updating Sections", () => {
			it("enforces single detailed research plan constraint", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "section-1",
						is_detailed_research_plan: true,
						max_words: 3000,
						order: 0,
						parent_id: null,
						title: "First Section",
					}),
					GrantSectionFactory.build({
						id: "section-2",
						is_detailed_research_plan: false,
						max_words: 3000,
						order: 1,
						parent_id: null,
						title: "Second Section",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const expandButtons = screen.getAllByTestId("expand-section-button");
				fireEvent.click(expandButtons[1]);

				await waitFor(() => {
					expect(screen.getByTestId("edit-form-container")).toBeInTheDocument();
				});

				const researchPlanCheckbox = screen.getByTestId("research-plan-checkbox");
				fireEvent.click(researchPlanCheckbox);

				const saveButton = screen.getByTestId("save-button");
				fireEvent.click(saveButton);

				await waitFor(() => {
					expect(mockUpdateGrantSections).toHaveBeenCalled();
				});

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const section1 = updatedSections.find((s: UpdateGrantSection) => s.id === "section-1");
				const section2 = updatedSections.find((s: UpdateGrantSection) => s.id === "section-2");

				expect(section1?.is_detailed_research_plan).toBe(false);
				expect(section2?.is_detailed_research_plan).toBe(true);
			});
		});
	});

	describe("Drag & Drop Reordering Outcomes", () => {
		describe("Main-to-Main Moves", () => {
			it("moves standalone main section to new position", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null, title: "A" }),
					GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null, title: "B" }),
					GrantSectionFactory.build({ id: "main-3", order: 2, parent_id: null, title: "C" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 0, 2, sections[0], sections[2]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const ordered = updatedSections.sort(
					(a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order,
				);

				expect(ordered[0].id).toBe("main-2");
				expect(ordered[1].id).toBe("main-3");
				expect(ordered[2].id).toBe("main-1");
			});

			it("moves main section with subsections as a group", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1a", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-1b", order: 2, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "main-2", order: 3, parent_id: null }),
					GrantSectionFactory.build({ id: "main-3", order: 4, parent_id: null }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 0, 4, sections[0], sections[4]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const ordered = updatedSections.sort(
					(a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order,
				);

				expect(ordered[0].id).toBe("main-2");
				expect(ordered[1].id).toBe("main-3");
				expect(ordered[2].id).toBe("main-1");
				expect(ordered[3].id).toBe("sub-1a");
				expect(ordered[3].parent_id).toBe("main-1");
				expect(ordered[4].id).toBe("sub-1b");
				expect(ordered[4].parent_id).toBe("main-1");
			});
		});

		describe("Main-to-Sub Conversions", () => {
			it("converts main without subs to subsection", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-2" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 0, 2, sections[0], sections[2]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const main1 = updatedSections.find((s: UpdateGrantSection) => s.id === "main-1");

				expect(main1?.parent_id).toBe("main-2");
				expect(updatedSections).toHaveLength(3);
			});

			it("shows confirmation when converting main with subs", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "main-1",
						order: 0,
						parent_id: null,
						title: "Main 1",
					}),
					GrantSectionFactory.build({
						id: "sub-1",
						order: 1,
						parent_id: "main-1",
						title: "Sub 1",
					}),
					GrantSectionFactory.build({
						id: "main-2",
						order: 2,
						parent_id: null,
						title: "Main 2",
					}),
					GrantSectionFactory.build({
						id: "sub-2",
						order: 3,
						parent_id: "main-2",
						title: "Sub 2",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 0, 3, sections[0], sections[3]);

				expect(dialogRef.current.open).toHaveBeenCalledWith(
					expect.objectContaining({
						description: expect.stringContaining("permanently remove"),
						title: "This action will affect the section structure!",
					}),
				);

				const [[dialogOptions]] = vi.mocked(dialogRef.current.open).mock.calls;
				const [, confirmButton] = (dialogOptions as any).footer.props.children;
				await confirmButton.props.onClick();

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				expect(updatedSections).toHaveLength(3);
				const main1 = updatedSections.find((s: UpdateGrantSection) => s.id === "main-1");
				expect(main1?.parent_id).toBe("main-2");
			});

			it("prevents moving main into its own subsection", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "main-1",
						order: 0,
						parent_id: null,
						title: "Main Section",
					}),
					GrantSectionFactory.build({
						id: "sub-1",
						order: 1,
						parent_id: "main-1",
						title: "Sub Section",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 0, 1, sections[0], sections[1]);

				expect(mockUpdateGrantSections).not.toHaveBeenCalled();
			});
		});

		describe("Sub-to-Sub Moves", () => {
			it("reorders within same parent", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-3", order: 3, parent_id: "main-1" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 1, 3, sections[1], sections[3]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const subs = updatedSections
					.filter((s: UpdateGrantSection) => s.parent_id === "main-1")
					.sort((a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order);

				expect(subs[0].id).toBe("sub-2");
				expect(subs[1].id).toBe("sub-3");
				expect(subs[2].id).toBe("sub-1");
			});

			it("moves to different parent", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "main-2", order: 2, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-2", order: 3, parent_id: "main-2" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 1, 3, sections[1], sections[3]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const sub1 = updatedSections.find((s: UpdateGrantSection) => s.id === "sub-1");

				expect(sub1?.parent_id).toBe("main-2");
			});

			it("skips update if already in correct position", async () => {
				const sections = [
					GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
					GrantSectionFactory.build({ id: "sub-1", order: 1, parent_id: "main-1" }),
					GrantSectionFactory.build({ id: "sub-2", order: 2, parent_id: "main-1" }),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 2, 1, sections[2], sections[1]);

				expect(mockUpdateGrantSections).not.toHaveBeenCalled();
			});
		});

		describe("Sub-to-Main Moves", () => {
			it("moves subsection to different parent", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "main-1",
						order: 0,
						parent_id: null,
						title: "Main 1",
					}),
					GrantSectionFactory.build({
						id: "sub-1",
						order: 1,
						parent_id: "main-1",
						title: "Sub 1",
					}),
					GrantSectionFactory.build({
						id: "main-2",
						order: 2,
						parent_id: null,
						title: "Main 2",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				await dragHandlers.onReorder(sections, 1, 2, sections[1], sections[2]);

				const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
				const sub1 = updatedSections.find((s: UpdateGrantSection) => s.id === "sub-1");

				expect(sub1?.parent_id).toBe("main-2");

				const orderedSections = updatedSections.sort(
					(a: UpdateGrantSection, b: UpdateGrantSection) => a.order - b.order,
				);

				expect(orderedSections[0].id).toBe("main-1");
				expect(orderedSections[1].id).toBe("main-2");
				expect(orderedSections[2].id).toBe("sub-1");
				expect(orderedSections[2].parent_id).toBe("main-2");
			});
		});
	});

	describe("User Experience Outcomes", () => {
		describe("Expand/Collapse Behavior", () => {
			it("maintains single expanded section at a time", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "section-1",
						max_words: 3000,
						order: 0,
						parent_id: null,
						title: "First Section",
					}),
					GrantSectionFactory.build({
						id: "section-2",
						max_words: 3000,
						order: 1,
						parent_id: null,
						title: "Second Section",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const expandButtons = screen.getAllByTestId("expand-section-button");

				fireEvent.click(expandButtons[0]);

				await waitFor(() => {
					expect(screen.getByTestId("edit-form-container")).toBeInTheDocument();
				});

				fireEvent.click(expandButtons[1]);

				await waitFor(() => {
					expect(screen.getAllByTestId("edit-form-container")).toHaveLength(1);
				});
			});

			it("collapses expanded section when drag starts", async () => {
				const sections = [
					GrantSectionFactory.build({
						id: "section-1",
						max_words: 3000,
						order: 0,
						parent_id: null,
						title: "First Section",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const expandButton = screen.getByTestId("expand-section-button");
				fireEvent.click(expandButton);

				await waitFor(() => {
					expect(screen.getByTestId("edit-form-container")).toBeInTheDocument();
				});

				dragHandlers.onDragStart({});

				await waitFor(() => {
					expect(screen.queryByTestId("edit-form-container")).not.toBeInTheDocument();
				});
			});
		});

		describe("Visual Feedback", () => {
			it("updates drag over visual state", () => {
				const sections = [
					GrantSectionFactory.build({
						id: "section-1",
						order: 0,
						parent_id: null,
						title: "First Section",
					}),
					GrantSectionFactory.build({
						id: "section-2",
						order: 1,
						parent_id: null,
						title: "Second Section",
					}),
				];

				useApplicationStore.setState({
					application: ApplicationFactory.build({
						grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
					}),
				});

				render(
					<DragDropSectionManager
						dialogRef={dialogRef}
						isDetailedSection={mockIsDetailedSection}
						onAddSection={mockOnAddSection}
					/>,
				);

				const [, section2Container] = screen.getAllByTestId("section-container");

				dragHandlers.onDragOver({}, sections[0], sections[1]);

				expect(section2Container.dataset.dragOver).toBe("true");

				dragHandlers.onDragEnd({});

				expect(section2Container.dataset.dragOver).toBeUndefined();
			});
		});
	});

	describe("Edge Cases & Constraints", () => {
		it("maintains sequential order values", async () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
				GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null }),
				GrantSectionFactory.build({ id: "main-3", order: 2, parent_id: null }),
			];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(
				<DragDropSectionManager
					dialogRef={dialogRef}
					isDetailedSection={mockIsDetailedSection}
					onAddSection={mockOnAddSection}
				/>,
			);

			await dragHandlers.onReorder(sections, 0, 2, sections[0], sections[2]);

			const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
			const orders = updatedSections.map((s: UpdateGrantSection) => s.order).sort();

			expect(orders).toEqual([0, 1, 2]);
		});

		it("preserves parent relationships during moves", async () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
				GrantSectionFactory.build({ id: "sub-1a", order: 1, parent_id: "main-1" }),
				GrantSectionFactory.build({ id: "sub-1b", order: 2, parent_id: "main-1" }),
				GrantSectionFactory.build({ id: "main-2", order: 3, parent_id: null }),
			];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(
				<DragDropSectionManager
					dialogRef={dialogRef}
					isDetailedSection={mockIsDetailedSection}
					onAddSection={mockOnAddSection}
				/>,
			);

			await dragHandlers.onReorder(sections, 0, 3, sections[0], sections[3]);

			const [[updatedSections]] = mockUpdateGrantSections.mock.calls;
			const sub1a = updatedSections.find((s: UpdateGrantSection) => s.id === "sub-1a");
			const sub1b = updatedSections.find((s: UpdateGrantSection) => s.id === "sub-1b");

			expect(sub1a?.parent_id).toBe("main-1");
			expect(sub1b?.parent_id).toBe("main-1");
		});

		it("handles same item drag gracefully", async () => {
			const sections = [GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null })];

			useApplicationStore.setState({
				application: ApplicationFactory.build({
					grant_template: GrantTemplateFactory.build({ grant_sections: sections }),
				}),
			});

			render(
				<DragDropSectionManager
					dialogRef={dialogRef}
					isDetailedSection={mockIsDetailedSection}
					onAddSection={mockOnAddSection}
				/>,
			);

			await dragHandlers.onReorder(sections, 0, 0, sections[0], sections[0]);

			expect(mockUpdateGrantSections).not.toHaveBeenCalled();
		});
	});
});
