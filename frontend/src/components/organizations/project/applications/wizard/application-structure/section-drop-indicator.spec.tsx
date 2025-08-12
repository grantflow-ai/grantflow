import { GrantSectionFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DragDropContextData } from "./drag-drop-context";
import { SectionDropIndicator, SectionWithDropIndicators } from "./section-drop-indicator";

const mockDragContext: DragDropContextData = {
	activeIndex: -1,
	activeItem: null,
	isAnyDragging: false,
	overIndex: -1,
	overItem: null,
	sections: [],
};

vi.mock("./drag-drop-context", () => ({
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

const mockElement = {
	hasAttribute: vi.fn(),
};

const mockObserver = {
	disconnect: vi.fn(),
	observe: vi.fn(),
};

const originalMutationObserver = globalThis.MutationObserver;
// eslint-disable-next-line @typescript-eslint/no-deprecated
const originalQuerySelector = globalThis.document.querySelector;

beforeEach(() => {
	globalThis.MutationObserver = vi.fn(() => mockObserver) as any;
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	globalThis.document.querySelector = vi.fn(() => mockElement) as any;
	vi.clearAllMocks();
	mockElement.hasAttribute.mockReturnValue(false);

	Object.assign(mockDragContext, {
		activeIndex: -1,
		activeItem: null,
		isAnyDragging: false,
		overIndex: -1,
		overItem: null,
		sections: [],
	});
});

afterEach(() => {
	globalThis.MutationObserver = originalMutationObserver;
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	globalThis.document.querySelector = originalQuerySelector;
});

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
	const section = GrantSectionFactory.build();

	it("renders children when no drag is active", () => {
		render(
			<SectionWithDropIndicators section={section}>
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
			<SectionWithDropIndicators section={section}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		expect(screen.getByText("Test Content")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-above")).toBeInTheDocument();
		expect(screen.getByTestId("drop-indicator-below")).toBeInTheDocument();
	});

	it("sets up MutationObserver when dragging is active", () => {
		Object.assign(mockDragContext, {
			isAnyDragging: true,
		});

		render(
			<SectionWithDropIndicators section={section}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		// eslint-disable-next-line @typescript-eslint/no-deprecated
		expect(globalThis.document.querySelector).toHaveBeenCalledWith(`[data-sortable-id="${section.id}"]`);
		expect(mockObserver.observe).toHaveBeenCalled();
	});

	it("cleans up MutationObserver on unmount", () => {
		Object.assign(mockDragContext, {
			isAnyDragging: true,
		});

		const { unmount } = render(
			<SectionWithDropIndicators section={section}>
				<div>Test Content</div>
			</SectionWithDropIndicators>,
		);

		unmount();

		expect(mockObserver.disconnect).toHaveBeenCalled();
	});
});
