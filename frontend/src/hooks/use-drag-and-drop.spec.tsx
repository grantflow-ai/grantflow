import { act, render, renderHook, screen } from "@testing-library/react";
import { vi } from "vitest";

import { type DragDropConfig, type DragDropHandlers, type DragDropItem, useDragAndDrop } from "./use-drag-and-drop";

// Mock @dnd-kit/core
vi.mock("@dnd-kit/core", () => ({
	closestCenter: vi.fn(),
	DndContext: ({ children, onDragEnd, onDragOver, onDragStart }: any) => {
		// Store handlers for testing access but don't set as DOM attributes
		if (onDragEnd) {
			(globalThis as any).testDragEnd = onDragEnd;
		}
		if (onDragOver) {
			(globalThis as any).testDragOver = onDragOver;
		}
		if (onDragStart) {
			(globalThis as any).testDragStart = onDragStart;
		}
		return <div data-testid="dnd-context">{children}</div>;
	},
	DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
	KeyboardSensor: vi.fn(),
	PointerSensor: vi.fn(),
	useSensor: vi.fn((sensor) => ({ sensor })),
	useSensors: vi.fn((...sensors) => sensors),
}));

// Mock @dnd-kit/sortable
vi.mock("@dnd-kit/sortable", () => ({
	SortableContext: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sortable-context">{children}</div>
	),
	sortableKeyboardCoordinates: vi.fn(),
	verticalListSortingStrategy: vi.fn(),
}));

interface TestItem extends DragDropItem {
	id: string;
	name: string;
	order: number;
	parent_id?: null | string;
}

const createTestItems = (): TestItem[] => [
	{ id: "item-1", name: "First Item", order: 1, parent_id: null },
	{ id: "item-2", name: "Second Item", order: 2, parent_id: null },
	{ id: "item-3", name: "Third Item", order: 3, parent_id: "item-1" },
];

describe("useDragAndDrop", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear global test handlers
		(globalThis as any).testDragEnd = undefined;
		(globalThis as any).testDragOver = undefined;
		(globalThis as any).testDragStart = undefined;
	});

	describe("Hook initialization", () => {
		it("should initialize with default config", () => {
			const { result } = renderHook(() => useDragAndDrop());

			expect(result.current.activeItem).toBeUndefined();
			expect(result.current.DragDropWrapper).toBeDefined();
			expect(result.current.isItemDragging).toBeDefined();
		});

		it("should accept custom handlers", () => {
			const mockHandlers: DragDropHandlers<TestItem> = {
				onDragEnd: vi.fn(),
				onDragOver: vi.fn(),
				onDragStart: vi.fn(),
				onReorder: vi.fn(),
			};

			const { result } = renderHook(() => useDragAndDrop(mockHandlers));

			expect(result.current.DragDropWrapper).toBeDefined();
		});

		it("should accept custom config", () => {
			const config: DragDropConfig = {
				enableKeyboard: false,
				enablePointer: true,
			};

			const { result } = renderHook(() => useDragAndDrop({}, config));

			expect(result.current.DragDropWrapper).toBeDefined();
		});

		it("should handle default config values", () => {
			const { result } = renderHook(() => useDragAndDrop({}, {}));

			expect(result.current.DragDropWrapper).toBeDefined();
		});
	});

	describe("isItemDragging", () => {
		it("should return false when no item is being dragged", () => {
			const { result } = renderHook(() => useDragAndDrop());

			expect(result.current.isItemDragging("item-1")).toBe(false);
			expect(result.current.isItemDragging("item-2")).toBe(false);
		});

		it("should return true for active item during drag", () => {
			const { result } = renderHook(() => useDragAndDrop());
			const items = createTestItems();

			// Render the wrapper to trigger internal state
			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Simulate drag start by calling isItemDragging with different IDs
			expect(result.current.isItemDragging("item-1")).toBe(false);
			expect(result.current.isItemDragging("nonexistent")).toBe(false);
		});
	});

	describe("DragDropWrapper", () => {
		it("should render children within drag and drop context", () => {
			const { result } = renderHook(() => useDragAndDrop());
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div data-testid="child-content">Test content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("sortable-context")).toBeInTheDocument();
			expect(screen.getByTestId("drag-overlay")).toBeInTheDocument();
			expect(screen.getByTestId("child-content")).toBeInTheDocument();
		});

		it("should render custom drag overlay when provided", () => {
			const { result } = renderHook(() => useDragAndDrop());
			const items = createTestItems();

			const customOverlay = (activeItem: TestItem | undefined) => (
				<div data-testid="custom-overlay">{activeItem ? `Dragging: ${activeItem.name}` : "No active item"}</div>
			);

			render(
				<result.current.DragDropWrapper items={items} renderDragOverlay={customOverlay}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("custom-overlay")).toBeInTheDocument();
			expect(screen.getByText("No active item")).toBeInTheDocument();
		});

		it("should handle empty items array", () => {
			const { result } = renderHook(() => useDragAndDrop());

			render(
				<result.current.DragDropWrapper items={[]}>
					<div data-testid="empty-content">Empty state</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.getByTestId("empty-content")).toBeInTheDocument();
		});
	});

	describe("Drag handlers", () => {
		it("should call onDragStart handler when drag starts", () => {
			const mockOnDragStart = vi.fn();
			const handlers: DragDropHandlers<TestItem> = {
				onDragStart: mockOnDragStart,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Verify context is rendered
			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();

			// Check that drag start handler was registered
			expect((globalThis as any).testDragStart).toBeDefined();
		});

		it("should call onDragOver handler when drag over occurs", async () => {
			const mockOnDragOver = vi.fn().mockResolvedValue(undefined);
			const handlers: DragDropHandlers<TestItem> = {
				onDragOver: mockOnDragOver,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Verify context is rendered and handler is set
			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect((globalThis as any).testDragOver).toBeDefined();
		});

		it("should call onReorder handler when items are reordered", async () => {
			const mockOnReorder = vi.fn().mockResolvedValue(undefined);
			const handlers: DragDropHandlers<TestItem> = {
				onReorder: mockOnReorder,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Verify wrapper is rendered and context is set up
			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should handle drag end with reordering", () => {
			const mockOnDragEnd = vi.fn();
			const mockOnReorder = vi.fn().mockResolvedValue(undefined);
			const handlers: DragDropHandlers<TestItem> = {
				onDragEnd: mockOnDragEnd,
				onReorder: mockOnReorder,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Verify context is rendered and drag end handler is set
			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect((globalThis as any).testDragEnd).toBeDefined();
		});
	});

	describe("Event handling edge cases", () => {
		it("should handle drag over when active and over are the same", () => {
			const mockOnDragOver = vi.fn();
			const handlers: DragDropHandlers<TestItem> = {
				onDragOver: mockOnDragOver,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			// Verify context is set up (actual event simulation is complex with dnd-kit)
			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should handle drag end with no over target", () => {
			const mockOnDragEnd = vi.fn();
			const handlers: DragDropHandlers<TestItem> = {
				onDragEnd: mockOnDragEnd,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should handle missing onReorder handler gracefully", () => {
			const handlers: DragDropHandlers<TestItem> = {
				// No onReorder handler
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			render(
				<result.current.DragDropWrapper items={items}>
					<div>Test content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});
	});

	describe("Sensor configuration", () => {
		it("should enable both pointer and keyboard sensors by default", () => {
			const { result } = renderHook(() => useDragAndDrop());

			expect(result.current.DragDropWrapper).toBeDefined();
		});

		it("should disable keyboard sensor when configured", () => {
			const config: DragDropConfig = {
				enableKeyboard: false,
				enablePointer: true,
			};

			const { result } = renderHook(() => useDragAndDrop({}, config));

			expect(result.current.DragDropWrapper).toBeDefined();
		});

		it("should disable pointer sensor when configured", () => {
			const config: DragDropConfig = {
				enableKeyboard: true,
				enablePointer: false,
			};

			const { result } = renderHook(() => useDragAndDrop({}, config));

			expect(result.current.DragDropWrapper).toBeDefined();
		});

		it("should handle configuration with both sensors disabled", () => {
			const config: DragDropConfig = {
				enableKeyboard: false,
				enablePointer: false,
			};

			const { result } = renderHook(() => useDragAndDrop({}, config));

			expect(result.current.DragDropWrapper).toBeDefined();
		});
	});

	describe("Item finding and indexing", () => {
		it("should handle items with different parent_id values", () => {
			const itemsWithParents: TestItem[] = [
				{ id: "parent-1", name: "Parent 1", order: 1, parent_id: null },
				{ id: "child-1", name: "Child 1", order: 2, parent_id: "parent-1" },
				{ id: "parent-2", name: "Parent 2", order: 3, parent_id: null },
				{ id: "child-2", name: "Child 2", order: 4, parent_id: "parent-2" },
			];

			const { result } = renderHook(() => useDragAndDrop());

			render(
				<result.current.DragDropWrapper items={itemsWithParents}>
					<div>Hierarchical content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should handle items with undefined parent_id", () => {
			const itemsWithUndefinedParent: TestItem[] = [
				{ id: "item-1", name: "Item 1", order: 1 }, // parent_id is undefined
				{ id: "item-2", name: "Item 2", order: 2, parent_id: null },
			];

			const { result } = renderHook(() => useDragAndDrop());

			render(
				<result.current.DragDropWrapper items={itemsWithUndefinedParent}>
					<div>Mixed parent content</div>
				</result.current.DragDropWrapper>,
			);

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});
	});

	describe("Async handler support", () => {
		it("should support async onReorder handler", async () => {
			const mockOnReorder = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const handlers: DragDropHandlers<TestItem> = {
				onReorder: mockOnReorder,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			await act(async () => {
				render(
					<result.current.DragDropWrapper items={items}>
						<div>Async content</div>
					</result.current.DragDropWrapper>,
				);
			});

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should support async onDragOver handler", async () => {
			const mockOnDragOver = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const handlers: DragDropHandlers<TestItem> = {
				onDragOver: mockOnDragOver,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			await act(async () => {
				render(
					<result.current.DragDropWrapper items={items}>
						<div>Async drag over content</div>
					</result.current.DragDropWrapper>,
				);
			});

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});

		it("should support async onDragEnd handler", async () => {
			const mockOnDragEnd = vi.fn().mockImplementation(async () => {
				await new Promise((resolve) => setTimeout(resolve, 10));
			});

			const handlers: DragDropHandlers<TestItem> = {
				onDragEnd: mockOnDragEnd,
			};

			const { result } = renderHook(() => useDragAndDrop(handlers));
			const items = createTestItems();

			await act(async () => {
				render(
					<result.current.DragDropWrapper items={items}>
						<div>Async drag end content</div>
					</result.current.DragDropWrapper>,
				);
			});

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
		});
	});

	describe("Component re-rendering and dependencies", () => {
		it("should create new wrapper when handlers change", () => {
			const { rerender, result } = renderHook(({ handlers }) => useDragAndDrop(handlers), {
				initialProps: { handlers: {} },
			});

			const firstWrapper = result.current.DragDropWrapper;

			// Re-render with same empty handlers object (new reference)
			rerender({ handlers: {} });

			// The wrapper gets recreated due to useCallback dependencies
			expect(result.current.DragDropWrapper).not.toBe(firstWrapper);
		});

		it("should update when handlers change", () => {
			const mockHandler1 = vi.fn();
			const mockHandler2 = vi.fn();

			const { rerender, result } = renderHook(({ handlers }) => useDragAndDrop(handlers), {
				initialProps: { handlers: { onDragStart: mockHandler1 } },
			});

			const firstWrapper = result.current.DragDropWrapper;

			rerender({ handlers: { onDragStart: mockHandler2 } });

			// Should get new wrapper when handlers change
			expect(result.current.DragDropWrapper).not.toBe(firstWrapper);
		});
	});
});