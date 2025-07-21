import { GrantSectionDetailedFactory, GrantSectionFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SortableSection } from "./grant-sections";

vi.mock("@dnd-kit/sortable", () => ({
	useSortable: vi.fn(() => ({
		attributes: {},
		isDragging: false,
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		transition: undefined,
	})),
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: {
		Transform: {
			toString: vi.fn(() => ""),
		},
	},
}));

vi.mock("./section-icon-button", () => ({
	SectionIconButton: vi.fn(({ children, className, "data-testid": testId, onClick }) => (
		<button className={className} data-testid={testId} onClick={onClick} type="button">
			{children}
		</button>
	)),
}));

vi.mock("@/components/ui/tooltip", () => ({
	Tooltip: vi.fn(({ children }) => <div>{children}</div>),
	TooltipContent: vi.fn(({ children }) => <div>{children}</div>),
	TooltipProvider: vi.fn(({ children }) => <div>{children}</div>),
	TooltipTrigger: vi.fn(({ children }) => <div>{children}</div>),
}));

describe("SortableSection", () => {
	const user = userEvent.setup();

	const mockOnUpdate = vi.fn();
	const mockOnDelete = vi.fn();
	const mockOnToggleExpand = vi.fn();
	const mockOnAddSubsection = vi.fn();
	const mockIsDetailedSection = vi.fn();
	const mockToUpdateGrantSection = vi.fn();

	const defaultProps = {
		isDetailedSection: mockIsDetailedSection,
		isExpanded: false,
		onDelete: mockOnDelete,
		onToggleExpand: mockOnToggleExpand,
		onUpdate: mockOnUpdate,
		toUpdateGrantSection: mockToUpdateGrantSection,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders section with title", () => {
		const section = GrantSectionFactory.build({ title: "Introduction" });

		render(<SortableSection {...defaultProps} section={section} />);

		expect(screen.getByTestId("section-title")).toHaveTextContent("Introduction");
	});

	it("renders section with max words display", () => {
		const section = GrantSectionDetailedFactory.build({
			max_words: 3000,
			title: "Methods",
		});

		render(<SortableSection {...defaultProps} section={section} />);

		expect(screen.getByTestId("max-words-display")).toHaveTextContent("3,000 Max words");
	});

	it("does not show max words for sections without max_words", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} section={section} />);

		expect(screen.queryByTestId("max-words-display")).not.toBeInTheDocument();
	});

	it("shows edit form when expanded", () => {
		const section = GrantSectionDetailedFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		expect(screen.getByTestId("edit-form-container")).toBeInTheDocument();
		expect(screen.getByTestId(`section-name-${section.id}`)).toBeInTheDocument();
		expect(screen.getByTestId("save-button")).toBeInTheDocument();
		expect(screen.getByTestId("cancel-button")).toBeInTheDocument();
	});

	it("hides edit form when not expanded", () => {
		const section = GrantSectionDetailedFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={false} section={section} />);

		expect(screen.queryByTestId("edit-form-container")).not.toBeInTheDocument();
	});

	it("calls onToggleExpand when expand button is clicked", async () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} section={section} />);

		await user.click(screen.getByTestId("expand-section-button"));
		expect(mockOnToggleExpand).toHaveBeenCalledOnce();
	});

	it("calls onDelete when delete button is clicked", async () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} section={section} />);

		await user.click(screen.getByTestId("delete-section-button"));
		expect(mockOnDelete).toHaveBeenCalledOnce();
	});

	it("shows add subsection button for regular sections", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} onAddSubsection={mockOnAddSubsection} section={section} />);

		expect(screen.getByTestId("add-subsection-button")).toBeInTheDocument();
	});

	it("hides add subsection button for subsections", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isSubsection={true} section={section} />);

		expect(screen.queryByTestId("add-subsection-button")).not.toBeInTheDocument();
	});

	it("calls onAddSubsection with section id when add subsection is clicked", async () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} onAddSubsection={mockOnAddSubsection} section={section} />);

		await user.click(screen.getByTestId("add-subsection-button"));
		expect(mockOnAddSubsection).toHaveBeenCalledWith(section.id);
	});

	it("updates form data when section name is changed", async () => {
		const section = GrantSectionDetailedFactory.build({ title: "Original Title" });

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const input = screen.getByTestId(`section-name-${section.id}`);
		await user.clear(input);
		await user.type(input, "New Title");

		expect(input).toHaveValue("New Title");
	});

	it("updates form data when max count is changed", async () => {
		const section = GrantSectionDetailedFactory.build({ max_words: 3000 });

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const input = screen.getByTestId(`max-count-${section.id}`);
		await user.clear(input);
		await user.type(input, "5000");

		expect(input).toHaveValue(5000);
	});

	it("updates AI prompt when edited", async () => {
		const section = GrantSectionDetailedFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const textarea = screen.getByLabelText("AI Prompt");
		await user.clear(textarea);
		await user.type(textarea, "Custom AI prompt");

		expect(textarea).toHaveValue("Custom AI prompt");
	});

	it("toggles research plan designation", async () => {
		const section = GrantSectionDetailedFactory.build({ is_detailed_research_plan: false });

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const toggle = screen.getByTestId("research-plan-checkbox");
		expect(toggle).toHaveAttribute("aria-checked", "false");

		await user.click(toggle);
		expect(toggle).toHaveAttribute("aria-checked", "true");
	});

	it("calls onUpdate with correct data when save is clicked", async () => {
		const section = GrantSectionDetailedFactory.build({
			is_detailed_research_plan: false,
			max_words: 3000,
			title: "Original",
		});

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const nameInput = screen.getByTestId(`section-name-${section.id}`);
		await user.clear(nameInput);
		await user.type(nameInput, "Updated Title");

		const maxCountInput = screen.getByTestId(`max-count-${section.id}`);
		await user.clear(maxCountInput);
		await user.type(maxCountInput, "5000");

		const researchPlanToggle = screen.getByTestId("research-plan-checkbox");
		await user.click(researchPlanToggle);

		await user.click(screen.getByTestId("save-button"));

		expect(mockOnUpdate).toHaveBeenCalledWith({
			is_detailed_research_plan: true,
			max_words: 5000,
			title: "Updated Title",
		});
		expect(mockOnToggleExpand).toHaveBeenCalled();
	});

	it("calls onToggleExpand when cancel is clicked", async () => {
		const section = GrantSectionDetailedFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		await user.click(screen.getByTestId("cancel-button"));
		expect(mockOnToggleExpand).toHaveBeenCalledOnce();
	});

	it("applies subsection styles when isSubsection is true", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isSubsection={true} section={section} />);

		const container = screen.getByTestId("section-container");
		expect(container).toHaveClass("ml-[6.875rem]", "px-3", "py-2");
	});

	it("applies regular section styles when isSubsection is false", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isSubsection={false} section={section} />);

		const container = screen.getByTestId("section-container");
		expect(container).toHaveClass("px-3", "py-4");
		expect(container).not.toHaveClass("ml-[6.875rem]");
	});

	it("shows subsection-specific labels in edit form", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={true} isSubsection={true} section={section} />);

		expect(screen.getByTestId(`edit-form-header-${section.id}`)).toHaveTextContent("Sub-section name");
	});

	it("generates AI prompt based on section title", () => {
		const section = GrantSectionDetailedFactory.build({ title: "Background" });

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const aiPrompt = screen.getByLabelText("AI Prompt");
		expect(aiPrompt.value).toContain("'Background' section for a research grant application");
		expect(aiPrompt.value).toContain("research grant application");
	});

	it("applies dragging styles when isDragging is true", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isDragging={true} section={section} />);

		const container = screen.getByTestId("section-container");
		expect(container).toHaveClass("bg-app-gray-500");
	});

	it("handles sections without max_words property", () => {
		const section = GrantSectionFactory.build();

		render(<SortableSection {...defaultProps} isExpanded={true} section={section} />);

		const maxCountInput = screen.getByTestId(`max-count-${section.id}`);
		expect(maxCountInput).toHaveValue(3000);
	});
});
