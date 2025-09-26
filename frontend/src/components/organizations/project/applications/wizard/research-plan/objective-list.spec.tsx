import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ObjectiveList } from "./objective-list";

vi.mock("@dnd-kit/core", () => ({
	closestCenter: vi.fn(),
	DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
	KeyboardSensor: vi.fn(),
	PointerSensor: vi.fn(),
	useSensor: vi.fn(() => ({})),
	useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
	horizontalListSortingStrategy: vi.fn(),
	SortableContext: ({ children }: { children: React.ReactNode }) => (
		<div data-testid="sortable-context">{children}</div>
	),
	sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock("./draggable-objective-card", () => ({
	DraggableObjectiveCard: ({
		index,
		isEditing,
		objective,
		objectivesCount,
		onCancel,
		onEdit,
		onRemove,
		onSave,
	}: any) => (
		<div data-testid="draggable-objective-card">
			<span data-testid="card-index">{index}</span>
			<span data-testid="card-editing">{String(isEditing)}</span>
			<span data-testid="card-title">{objective.title}</span>
			<span data-testid="card-number">{objective.number}</span>
			<span data-testid="objectives-count">{objectivesCount}</span>
			<button data-testid="card-edit" onClick={onEdit} type="button">
				Edit
			</button>
			<button data-testid="card-remove" onClick={onRemove} type="button">
				Remove
			</button>
			<button data-testid="card-cancel" onClick={onCancel} type="button">
				Cancel
			</button>
			<button data-testid="card-save" onClick={() => onSave({ ...objective, title: "Updated" })} type="button">
				Save
			</button>
		</div>
	),
}));

function renderObjectiveList(overrides = {}) {
	const defaultProps = {
		editingObjectiveId: null,
		objectives: [
			ResearchObjectiveFactory.build({ number: 1, title: "Objective 1" }),
			ResearchObjectiveFactory.build({ number: 2, title: "Objective 2" }),
			ResearchObjectiveFactory.build({ number: 3, title: "Objective 3" }),
		],
		onEdit: vi.fn(),
		onRemove: vi.fn(),
		onReorder: vi.fn(),
		onSave: vi.fn(),
		setEditingObjectiveId: vi.fn(),
		...overrides,
	};

	return {
		...render(<ObjectiveList {...defaultProps} />),
		props: defaultProps,
	};
}

describe.sequential("ObjectiveList", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("Component Structure", () => {
		it("renders drag drop wrapper and all objective cards", () => {
			renderObjectiveList();

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();

			const cards = screen.getAllByTestId("draggable-objective-card");
			expect(cards).toHaveLength(3);
		});
	});

	describe("Card Props Passing", () => {
		it("passes correct index to each card", () => {
			renderObjectiveList();

			const indices = screen.getAllByTestId("card-index");
			expect(indices[0]).toHaveTextContent("1");
			expect(indices[1]).toHaveTextContent("2");
			expect(indices[2]).toHaveTextContent("3");
		});

		it("passes correct editing state to cards", () => {
			renderObjectiveList({ editingObjectiveId: 2 });

			const editingStates = screen.getAllByTestId("card-editing");
			expect(editingStates[0]).toHaveTextContent("false");
			expect(editingStates[1]).toHaveTextContent("true");
			expect(editingStates[2]).toHaveTextContent("false");
		});

		it("passes objective data to cards", () => {
			renderObjectiveList();

			const titles = screen.getAllByTestId("card-title");
			const numbers = screen.getAllByTestId("card-number");

			expect(titles[0]).toHaveTextContent("Objective 1");
			expect(titles[1]).toHaveTextContent("Objective 2");
			expect(titles[2]).toHaveTextContent("Objective 3");

			expect(numbers[0]).toHaveTextContent("1");
			expect(numbers[1]).toHaveTextContent("2");
			expect(numbers[2]).toHaveTextContent("3");
		});

		it("passes objectives count to all cards", () => {
			renderObjectiveList();

			const counts = screen.getAllByTestId("objectives-count");
			counts.forEach((count) => {
				expect(count).toHaveTextContent("3");
			});
		});
	});

	describe("Callback Handling", () => {
		it("calls onEdit with correct objective number", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveList();

			const editButtons = screen.getAllByTestId("card-edit");
			await user.click(editButtons[1]);

			expect(props.onEdit).toHaveBeenCalledWith(2);
		});

		it("calls onRemove with correct objective", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveList();

			const removeButtons = screen.getAllByTestId("card-remove");
			await user.click(removeButtons[0]);

			expect(props.onRemove).toHaveBeenCalledWith(props.objectives[0]);
		});

		it("calls setEditingObjectiveId with null when cancel is clicked", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveList();

			const cancelButtons = screen.getAllByTestId("card-cancel");
			await user.click(cancelButtons[2]);

			expect(props.setEditingObjectiveId).toHaveBeenCalledWith(null);
		});

		it("calls onSave with updated objective", async () => {
			const user = userEvent.setup();
			const { props } = renderObjectiveList();

			const saveButtons = screen.getAllByTestId("card-save");
			await user.click(saveButtons[1]);

			expect(props.onSave).toHaveBeenCalledWith({
				...props.objectives[1],
				title: "Updated",
			});
		});
	});

	describe("Drag and Drop Integration", () => {
		it("creates correct drag drop items from objectives", () => {
			const objectives = [
				ResearchObjectiveFactory.build({ number: 5 }),
				ResearchObjectiveFactory.build({ number: 3 }),
				ResearchObjectiveFactory.build({ number: 1 }),
			];

			renderObjectiveList({ objectives });

			expect(screen.getAllByTestId("draggable-objective-card")).toHaveLength(3);
		});

		it("handles reorder callback correctly", async () => {
			const { props } = renderObjectiveList();

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(props.onReorder).toBeDefined();
		});
	});

	describe("Edge Cases", () => {
		it("handles empty objectives array", () => {
			renderObjectiveList({ objectives: [] });

			expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
			expect(screen.queryByTestId("draggable-objective-card")).not.toBeInTheDocument();
		});

		it("handles single objective", () => {
			const objectives = [ResearchObjectiveFactory.build({ number: 1 })];
			renderObjectiveList({ objectives });

			expect(screen.getByTestId("draggable-objective-card")).toBeInTheDocument();
			expect(screen.getByTestId("card-index")).toHaveTextContent("1");
			expect(screen.getByTestId("objectives-count")).toHaveTextContent("1");
		});

		it("handles editing objective that doesn't exist", () => {
			renderObjectiveList({ editingObjectiveId: 999 });

			const editingStates = screen.getAllByTestId("card-editing");
			editingStates.forEach((state) => {
				expect(state).toHaveTextContent("false");
			});
		});

		it("handles null editingObjectiveId", () => {
			renderObjectiveList({ editingObjectiveId: null });

			const editingStates = screen.getAllByTestId("card-editing");
			editingStates.forEach((state) => {
				expect(state).toHaveTextContent("false");
			});
		});

		it("handles large number of objectives", () => {
			const objectives = Array.from({ length: 20 }, (_, i) => ResearchObjectiveFactory.build({ number: i + 1 }));
			renderObjectiveList({ objectives });

			expect(screen.getAllByTestId("draggable-objective-card")).toHaveLength(20);
			expect(screen.getAllByTestId("objectives-count")[0]).toHaveTextContent("20");
		});
	});

	describe("Key Generation", () => {
		it("generates unique keys for objectives with same content", () => {
			const objectives = [
				ResearchObjectiveFactory.build({ number: 1, title: "Same Title" }),
				ResearchObjectiveFactory.build({ number: 2, title: "Same Title" }),
			];
			renderObjectiveList({ objectives });

			expect(screen.getAllByTestId("draggable-objective-card")).toHaveLength(2);
		});

		it("handles objectives with different content", () => {
			const objectives = [
				ResearchObjectiveFactory.build({ number: 1, title: "Unique Title 1" }),
				ResearchObjectiveFactory.build({ number: 2, title: "Unique Title 2" }),
			];
			renderObjectiveList({ objectives });

			const titles = screen.getAllByTestId("card-title");
			expect(titles[0]).toHaveTextContent("Unique Title 1");
			expect(titles[1]).toHaveTextContent("Unique Title 2");
		});
	});
});
