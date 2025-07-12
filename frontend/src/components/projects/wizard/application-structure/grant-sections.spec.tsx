import { GrantSectionDetailedFactory, GrantSectionFactory } from "::testing/factories";
import { fireEvent, render, screen } from "@testing-library/react";
import { SortableSection } from "./grant-sections";

vi.mock("@dnd-kit/sortable", () => ({
	useSortable: vi.fn(() => ({
		attributes: {},
		isDragging: false,
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: null,
	})),
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: {
		Transform: {
			toString: vi.fn(() => ""),
		},
	},
}));

vi.mock("next/image", () => ({
	default: ({ alt, className, src }: { alt: string; className?: string; src: string }) => (
		<div className={className} data-src={src} data-testid={`image-${alt}`} />
	),
}));

describe("SortableSection", () => {
	const mockSection = GrantSectionDetailedFactory.build({
		id: "section-1",
		max_words: 3000,
		title: "Test Section",
	});

	const defaultProps = {
		isDetailedSection: vi.fn(() => true),
		isExpanded: false,
		onAddSubsection: vi.fn(),
		onDelete: vi.fn(),
		onToggleExpand: vi.fn(),
		onUpdate: vi.fn(),
		section: mockSection,
		toUpdateGrantSection: vi.fn((section) => section),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("collapsed state", () => {
		it("renders section title and max words", () => {
			render(<SortableSection {...defaultProps} />);

			expect(screen.getByTestId("section-title")).toBeInTheDocument();
			expect(screen.getByTestId("max-words-display")).toBeInTheDocument();
		});

		it("shows delete button", () => {
			render(<SortableSection {...defaultProps} />);

			expect(screen.getByTestId("delete-section-button")).toBeInTheDocument();
		});

		it("shows add subsection button for main sections", () => {
			render(<SortableSection {...defaultProps} />);

			expect(screen.getByTestId("add-subsection-button")).toBeInTheDocument();
		});

		it("hides add subsection button for subsections", () => {
			render(<SortableSection {...defaultProps} isSubsection={true} />);

			expect(screen.queryByTestId("add-subsection-button")).not.toBeInTheDocument();
		});

		it("shows expand button", () => {
			render(<SortableSection {...defaultProps} />);

			expect(screen.getByTestId("expand-section-button")).toBeInTheDocument();
		});

		it("calls onDelete when delete button is clicked", () => {
			render(<SortableSection {...defaultProps} />);

			const deleteButton = screen.getByTestId("delete-section-button");
			fireEvent.click(deleteButton);

			expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
		});

		it("calls onAddSubsection when add button is clicked", () => {
			render(<SortableSection {...defaultProps} />);

			const addButton = screen.getByTestId("add-subsection-button");
			fireEvent.click(addButton);

			expect(defaultProps.onAddSubsection).toHaveBeenCalledWith("section-1");
		});

		it("calls onToggleExpand when expand button is clicked", () => {
			render(<SortableSection {...defaultProps} />);

			const expandButton = screen.getByTestId("expand-section-button");
			fireEvent.click(expandButton);

			expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
		});

		it("show main section when there is a subsection", () => {
			render(<SortableSection {...defaultProps} isSubsection={true} />);

			const container = screen.getByTestId("section-container");
			expect(container).toBeInTheDocument();
		});

		it("applies main section when there is no subsection", () => {
			render(<SortableSection {...defaultProps} isSubsection={false} />);

			const container = screen.getByTestId("section-container");
			expect(container).toBeInTheDocument();
		});

		it("does not show max words when section has no max_words", () => {
			const sectionData = GrantSectionFactory.build({
				id: "section-2",
				title: "No Max Words Section",
			});

			render(<SortableSection {...defaultProps} isDetailedSection={() => false} section={sectionData} />);

			expect(screen.queryByText(/Max words/)).not.toBeInTheDocument();
		});
	});

	describe("expanded state (edit form)", () => {
		const expandedProps = {
			...defaultProps,
			isExpanded: true,
		};

		it("renders edit form when expanded", () => {
			render(<SortableSection {...expandedProps} />);

			expect(screen.getByTestId("edit-form-header-section-1")).toBeInTheDocument();
			expect(screen.getByLabelText("Section name")).toBeInTheDocument();
			expect(screen.getByTestId("words-characters-label")).toBeInTheDocument();
		});

		it("renders section name input with current title", () => {
			render(<SortableSection {...expandedProps} />);

			const input = screen.getByDisplayValue("Test Section");
			expect(input).toBeInTheDocument();
		});

		it("renders max words input with current value", () => {
			render(<SortableSection {...expandedProps} />);

			const input = screen.getByDisplayValue("3000");
			expect(input).toBeInTheDocument();
		});

		it("renders research plan checkbox", () => {
			render(<SortableSection {...expandedProps} />);

			expect(screen.getByTestId("research-plan-checkbox")).toBeInTheDocument();
		});

		it("renders save and cancel buttons", () => {
			render(<SortableSection {...expandedProps} />);

			expect(screen.getByTestId("save-button")).toBeInTheDocument();
			expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
		});

		it("calls onToggleExpand when cancel button is clicked", () => {
			render(<SortableSection {...expandedProps} />);

			const cancelButton = screen.getByRole("button", { name: "Cancel" });
			fireEvent.click(cancelButton);

			expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
		});

		it("calls onToggleExpand when collapse button is clicked", () => {
			render(<SortableSection {...expandedProps} />);

			const collapseButton = screen.getByTestId("image-Collapse").parentElement!;
			fireEvent.click(collapseButton);

			expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
		});

		it("updates form data when section name is changed", () => {
			render(<SortableSection {...expandedProps} />);

			const input = screen.getByDisplayValue("Test Section");
			fireEvent.change(input, { target: { value: "Updated Section" } });

			expect(input).toHaveValue("Updated Section");
		});

		it("updates form data when max words is changed", () => {
			render(<SortableSection {...expandedProps} />);

			const input = screen.getByDisplayValue("3000");
			fireEvent.change(input, { target: { value: "5000" } });

			expect(input).toHaveValue(5000);
		});

		it("updates form data when word/character selector is changed", () => {
			render(<SortableSection {...expandedProps} />);

			const select = screen.getByTestId("word-character-selector");
			fireEvent.change(select, { target: { value: "characters" } });

			expect(select).toHaveValue("characters");
		});

		it("calls onUpdate with form data when save is clicked", async () => {
			render(<SortableSection {...expandedProps} />);

			const titleInput = screen.getByDisplayValue("Test Section");
			fireEvent.change(titleInput, { target: { value: "Updated Title" } });

			const maxWordsInput = screen.getByDisplayValue("3000");
			fireEvent.change(maxWordsInput, { target: { value: "5000" } });

			const saveButton = screen.getByTestId("save-button");
			fireEvent.click(saveButton);

			expect(defaultProps.onUpdate).toHaveBeenCalledWith(
				expect.objectContaining({
					max_words: 5000,
					title: "Updated Title",
				}),
			);
			expect(defaultProps.onToggleExpand).toHaveBeenCalledTimes(1);
		});

		it("handles research plan checkbox toggle", () => {
			const sectionWithResearchPlan = GrantSectionDetailedFactory.build({
				id: "research-section",
				is_detailed_research_plan: false,
				title: "Research Section",
			});

			render(<SortableSection {...expandedProps} section={sectionWithResearchPlan} />);

			const checkbox = screen.getByTestId("research-plan-checkbox");
			expect(checkbox).not.toBeChecked();

			fireEvent.click(checkbox);
			expect(checkbox).toBeChecked();
		});
	});

	describe("drag and drop integration", () => {
		it("renders drag handle", () => {
			render(<SortableSection {...defaultProps} />);

			const container = screen.getByTestId("section-title").closest("div");
			expect(container).toBeInTheDocument();
		});
	});
});
