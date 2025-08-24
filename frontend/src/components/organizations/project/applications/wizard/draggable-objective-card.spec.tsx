import { setupAuthenticatedTest } from "::testing/auth-helpers";
import { ResearchObjectiveFactory } from "::testing/factories";
import { resetAllStores } from "::testing/store-reset";
import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DraggableObjectiveCard } from "./draggable-objective-card";

vi.mock("@dnd-kit/sortable", () => ({
	useSortable: () => ({
		attributes: { "data-testid": "sortable-attributes" },
		isDragging: false,
		listeners: { "data-testid": "sortable-listeners" },
		setNodeRef: vi.fn(),
		transform: null,
		transition: undefined,
	}),
}));

vi.mock("@dnd-kit/utilities", () => ({
	CSS: {
		Transform: {
			toString: (transform: any) => (transform ? "transform(10px, 10px)" : ""),
		},
	},
}));

vi.mock("./objective-components", () => ({
	EditableObjective: ({ index, objective, onCancel, onSave }: any) => (
		<div data-testid="editable-objective">
			<span data-testid="editable-objective-index">Index: {index}</span>
			<span data-testid="editable-objective-title">{objective.title}</span>
			<button data-testid="mock-cancel" onClick={onCancel} type="button">
				Cancel
			</button>
			<button
				data-testid="mock-save"
				onClick={() => onSave({ ...objective, title: "Updated Title" })}
				type="button"
			>
				Save
			</button>
		</div>
	),
	ObjectiveCardContent: ({ index, objective }: any) => (
		<div data-testid="objective-card-content">
			<span data-testid="content-index">Index: {index}</span>
			<span data-testid="content-title">{objective.title}</span>
		</div>
	),
	ObjectiveHeader: ({ index, isEditing, objective, objectivesCount, onCancel, onEdit, onRemove }: any) => (
		<div data-testid="objective-header">
			<span data-testid="header-index">Index: {index}</span>
			<span data-testid="header-editing">Editing: {String(isEditing)}</span>
			<span data-testid="header-count">Count: {objectivesCount}</span>
			<span data-testid="header-title">{objective.title}</span>
			<button data-testid="mock-edit" onClick={isEditing ? onCancel : onEdit} type="button">
				{isEditing ? "Cancel" : "Edit"}
			</button>
			<button data-testid="mock-remove" onClick={onRemove} type="button">
				Remove
			</button>
		</div>
	),
}));

function renderDraggableObjectiveCard(overrides = {}) {
	const defaultProps = {
		index: 1,
		isEditing: false,
		objective: ResearchObjectiveFactory.build({ number: 1, title: "Test Objective" }),
		objectivesCount: 3,
		onCancel: vi.fn(),
		onEdit: vi.fn(),
		onRemove: vi.fn(),
		onSave: vi.fn(),
		...overrides,
	};

	return {
		...render(<DraggableObjectiveCard {...defaultProps} />),
		props: defaultProps,
	};
}

describe.sequential("DraggableObjectiveCard", () => {
	beforeEach(() => {
		resetAllStores();
		setupAuthenticatedTest();
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("Component Structure", () => {
		it("renders card container and header component", () => {
			renderDraggableObjectiveCard();

			expect(screen.getByTestId("app-card")).toBeInTheDocument();
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});
	});

	describe("Header Props Passing", () => {
		it("passes correct props to ObjectiveHeader", () => {
			const objective = ResearchObjectiveFactory.build({ number: 2, title: "Custom Title" });

			renderDraggableObjectiveCard({
				index: 3,
				isEditing: true,
				objective,
				objectivesCount: 5,
			});

			expect(screen.getByTestId("header-index")).toHaveTextContent("Index: 3");
			expect(screen.getByTestId("header-editing")).toHaveTextContent("Editing: true");
			expect(screen.getByTestId("header-count")).toHaveTextContent("Count: 5");
			expect(screen.getByTestId("header-title")).toHaveTextContent("Custom Title");
		});

		it("passes callback functions to ObjectiveHeader", async () => {
			const user = userEvent.setup();
			const { props } = renderDraggableObjectiveCard();

			const editButton = screen.getByTestId("mock-edit");
			const removeButton = screen.getByTestId("mock-remove");

			await user.click(editButton);
			await user.click(removeButton);

			expect(props.onEdit).toHaveBeenCalledOnce();
			expect(props.onRemove).toHaveBeenCalledOnce();
		});
	});

	describe("Content Rendering States", () => {
		it("renders EditableObjective when in editing mode", () => {
			renderDraggableObjectiveCard({ isEditing: true });

			expect(screen.getByTestId("editable-objective")).toBeInTheDocument();
			expect(screen.queryByTestId("objective-card-content")).not.toBeInTheDocument();
		});

		it("renders ObjectiveCardContent when not in editing mode", () => {
			renderDraggableObjectiveCard({ isEditing: false });

			expect(screen.getByTestId("objective-card-content")).toBeInTheDocument();
			expect(screen.queryByTestId("editable-objective")).not.toBeInTheDocument();
		});

		it("passes correct props to EditableObjective", () => {
			const objective = ResearchObjectiveFactory.build({ number: 4, title: "Editable Title" });

			renderDraggableObjectiveCard({
				index: 2,
				isEditing: true,
				objective,
			});

			expect(screen.getByTestId("editable-objective-index")).toHaveTextContent("Index: 2");
			expect(screen.getByTestId("editable-objective-title")).toHaveTextContent("Editable Title");
		});

		it("passes correct props to ObjectiveCardContent", () => {
			const objective = ResearchObjectiveFactory.build({ number: 3, title: "Content Title" });

			renderDraggableObjectiveCard({
				index: 4,
				isEditing: false,
				objective,
			});

			expect(screen.getByTestId("content-index")).toHaveTextContent("Index: 4");
			expect(screen.getByTestId("content-title")).toHaveTextContent("Content Title");
		});
	});

	describe("Callback Handling", () => {
		it("calls onCancel when cancel is triggered in editing mode", async () => {
			const user = userEvent.setup();
			const { props } = renderDraggableObjectiveCard({ isEditing: true });

			const cancelButton = screen.getByTestId("mock-cancel");
			await user.click(cancelButton);

			expect(props.onCancel).toHaveBeenCalledOnce();
		});

		it("calls onSave with updated objective when save is triggered", async () => {
			const user = userEvent.setup();
			const objective = ResearchObjectiveFactory.build({ number: 1, title: "Original Title" });
			const { props } = renderDraggableObjectiveCard({ isEditing: true, objective });

			const saveButton = screen.getByTestId("mock-save");
			await user.click(saveButton);

			expect(props.onSave).toHaveBeenCalledWith({
				...objective,
				title: "Updated Title",
			});
		});

		it("triggers edit mode when edit button is clicked in header", async () => {
			const user = userEvent.setup();
			const { props } = renderDraggableObjectiveCard({ isEditing: false });

			const editButton = screen.getByTestId("mock-edit");
			await user.click(editButton);

			expect(props.onEdit).toHaveBeenCalledOnce();
		});

		it("triggers cancel when cancel button is clicked in header while editing", async () => {
			const user = userEvent.setup();
			const { props } = renderDraggableObjectiveCard({ isEditing: true });

			const cancelButton = screen.getByTestId("mock-edit");
			await user.click(cancelButton);

			expect(props.onCancel).toHaveBeenCalledOnce();
		});
	});

	describe("Drag and Drop Integration", () => {
		it("uses objective number as sortable ID", () => {
			const objective = ResearchObjectiveFactory.build({ number: 42 });

			renderDraggableObjectiveCard({ objective });

			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});

		it("handles different objective numbers for sortable ID", () => {
			const objective1 = ResearchObjectiveFactory.build({ number: 1 });
			const objective2 = ResearchObjectiveFactory.build({ number: 100 });

			const { unmount } = renderDraggableObjectiveCard({ objective: objective1 });
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();

			unmount();
			renderDraggableObjectiveCard({ objective: objective2 });
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});
	});

	describe("Edge Cases", () => {
		it("handles zero objectives count", () => {
			renderDraggableObjectiveCard({ objectivesCount: 0 });

			expect(screen.getByTestId("header-count")).toHaveTextContent("Count: 0");
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});

		it("handles large objective counts", () => {
			renderDraggableObjectiveCard({ objectivesCount: 999 });

			expect(screen.getByTestId("header-count")).toHaveTextContent("Count: 999");
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});

		it("handles high index values", () => {
			renderDraggableObjectiveCard({ index: 100 });

			expect(screen.getByTestId("header-index")).toHaveTextContent("Index: 100");
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});

		it("handles objectives with empty titles", () => {
			const objective = ResearchObjectiveFactory.build({ number: 1, title: "" });

			renderDraggableObjectiveCard({ objective });

			expect(screen.getByTestId("header-title")).toHaveTextContent("");
			expect(screen.getByTestId("objective-header")).toBeInTheDocument();
		});
	});
});
