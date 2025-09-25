import { GrantSectionFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DragDropContextData } from "./drag-drop-context";
import { DragDropContext } from "./drag-drop-context";
import { SectionDropIndicator, SectionWithDropIndicators } from "./section-drop-indicator";

const mockDragContext: DragDropContextData = {
	activeIndex: -1,
	activeItem: null,
	dragOverId: null,
	dragOverZone: null,
	isAnyDragging: false,
	overIndex: -1,
	overItem: null,
	sections: [],
	zone: null,
	zonePercent: null,
};

vi.mock("./drag-drop-context", () => ({
	DragDropContext: {
		Provider: ({ children }: { children: React.ReactNode; value: any }) => (
			<div data-testid="real-drag-context-provider">{children}</div>
		),
	},
	useDragDropContext: () => mockDragContext,
}));

vi.mock("@/utils/grant-sections", async () => {
	const actual = await vi.importActual("@/utils/grant-sections");
	return {
		...actual,
		calculateDropIndicatorVisibility: vi.fn(() => ({
			isSubsectionWidth: false,
			showAbove: false,
			showBelow: true,
		})),
	};
});

const testSection = GrantSectionFactory.build({ id: "test-section", order: 0, parent_id: null });

beforeEach(() => {
	vi.clearAllMocks();

	Object.assign(mockDragContext, {
		activeIndex: -1,
		activeItem: null,
		dragOverId: null,
		dragOverZone: null,
		isAnyDragging: false,
		overIndex: -1,
		overItem: null,
		sections: [],
		zone: null,
		zonePercent: null,
	});
});

const createRealDragContextProvider = (contextData: DragDropContextData) => {
	const getDragState = () => contextData;
	const DragContextProvider = ({ children }: { children: React.ReactNode }) => (
		<DragDropContext.Provider value={{ getDragState }}>{children}</DragDropContext.Provider>
	);
	DragContextProvider.displayName = "DragContextProvider";
	return DragContextProvider;
};

describe("SectionDropIndicator", () => {
	it("renders indicator with main section width", () => {
		render(<SectionDropIndicator isSubsectionWidth={false} isVisible={true} position="below" />);

		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders indicator with subsection width", () => {
		render(<SectionDropIndicator isSubsectionWidth={true} isVisible={true} position="below" />);

		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders above position indicator", () => {
		render(<SectionDropIndicator isSubsectionWidth={false} isVisible={true} position="above" />);

		expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
	});

	it("renders below position indicator", () => {
		render(<SectionDropIndicator isSubsectionWidth={false} isVisible={true} position="below" />);

		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders with opacity when visible", () => {
		render(<SectionDropIndicator isSubsectionWidth={false} isVisible={true} position="below" />);

		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders with opacity when not visible", () => {
		render(<SectionDropIndicator isSubsectionWidth={false} isVisible={false} position="below" />);

		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});
});

describe("SectionWithDropIndicators", () => {
	it("renders children when no drag is active", () => {
		render(
			<SectionWithDropIndicators section={testSection}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		expect(screen.getByText("Test Content")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders children only when dragging but not dragged over", () => {
		Object.assign(mockDragContext, {
			activeItem: GrantSectionFactory.build(),
			isAnyDragging: true,
			overItem: GrantSectionFactory.build(),
		});

		render(
			<SectionWithDropIndicators section={testSection}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		expect(screen.getByText("Test Content")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("renders drop indicators when dragging is active and section is dragged over", () => {
		Object.assign(mockDragContext, {
			activeItem: GrantSectionFactory.build({ id: "other-section" }),
			dragOverId: testSection.id,
			dragOverZone: "sibling",
			isAnyDragging: true,
			overItem: testSection,
		});

		render(
			<SectionWithDropIndicators section={testSection}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("hides drop indicators when not dragging or not dragged over", () => {
		Object.assign(mockDragContext, {
			activeItem: null,
			dragOverId: null,
			dragOverZone: null,
			isAnyDragging: false,
			overItem: null,
		});

		render(
			<SectionWithDropIndicators section={testSection}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		const aboveIndicator = screen.getByTestId("drop-indicator-above");
		const belowIndicator = screen.getByTestId("drop-indicator-below");

		expect(aboveIndicator).toHaveClass("opacity-0");
		expect(belowIndicator).toHaveClass("opacity-0");
	});

	describe("Integration Tests with Real Drag Context", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it("integrates SectionWithDropIndicators with real drag context provider", () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-1", order: 0, parent_id: null }),
				GrantSectionFactory.build({ id: "main-2", order: 1, parent_id: null }),
			];

			const dragContext: DragDropContextData = {
				activeIndex: 0,
				activeItem: sections[0],
				dragOverId: sections[1].id,
				dragOverZone: null,
				isAnyDragging: true,
				overIndex: 1,
				overItem: sections[1],
				sections,
				zone: null,
				zonePercent: null,
			};

			const RealDragProvider = createRealDragContextProvider(dragContext);

			render(
				<RealDragProvider>
					<SectionWithDropIndicators section={sections[1]}>
						<div>Section Content</div>
					</SectionWithDropIndicators>
				</RealDragProvider>,
			);

			const aboveIndicator = screen.getByTestId("drop-indicator-above");
			const belowIndicator = screen.getByTestId("drop-indicator-below");

			expect(aboveIndicator).toBeInTheDocument();
			expect(belowIndicator).toBeInTheDocument();
			expect(screen.getByText("Section Content")).toBeInTheDocument();
		});

		it("handles real drag context with complex section hierarchies", () => {
			const sections = [
				GrantSectionFactory.build({ id: "main-a", order: 0, parent_id: null }),
				GrantSectionFactory.build({ id: "sub-a1", order: 1, parent_id: "main-a" }),
				GrantSectionFactory.build({ id: "main-b", order: 2, parent_id: null }),
			];

			const dragContext: DragDropContextData = {
				activeIndex: 1,
				activeItem: sections[1],
				dragOverId: sections[2].id,
				dragOverZone: null,
				isAnyDragging: true,
				overIndex: 2,
				overItem: sections[2],
				sections,
				zone: null,
				zonePercent: null,
			};

			const RealDragProvider = createRealDragContextProvider(dragContext);

			render(
				<RealDragProvider>
					<SectionWithDropIndicators section={sections[2]}>
						<div>Target Section</div>
					</SectionWithDropIndicators>
				</RealDragProvider>,
			);

			expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
			expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
			expect(screen.getByText("Target Section")).toBeInTheDocument();
		});

		it("properly unmounts component with real drag context", () => {
			const sections = [GrantSectionFactory.build({ id: "test-section", order: 0, parent_id: null })];

			const dragContext: DragDropContextData = {
				activeIndex: -1,
				activeItem: null,
				dragOverId: null,
				dragOverZone: null,
				isAnyDragging: true,
				overIndex: -1,
				overItem: null,
				sections,
				zone: null,
				zonePercent: null,
			};

			const RealDragProvider = createRealDragContextProvider(dragContext);

			const { unmount } = render(
				<RealDragProvider>
					<SectionWithDropIndicators section={sections[0]}>
						<div>Content</div>
					</SectionWithDropIndicators>
				</RealDragProvider>,
			);

			expect(screen.getByText("Content")).toBeInTheDocument();
			expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
			expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();

			unmount();

			expect(screen.queryByText("Content")).not.toBeInTheDocument();
		});
	});
});
