import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { type DragDropItem, useDragOverlayStore } from "./drag-overlay-store";

const mockDragItem: DragDropItem = {
	id: "test-item-1",
	order: 0,
	parent_id: null,
};

describe("useDragOverlayStore", () => {
	beforeEach(() => {
		act(() => {
			useDragOverlayStore.getState().clearActiveItem();
		});
	});

	it("should initialize with undefined activeItem", () => {
		const { result } = renderHook(() => useDragOverlayStore());
		expect(result.current.activeItem).toBeUndefined();
	});

	it("should set and clear activeItem", () => {
		const { result } = renderHook(() => useDragOverlayStore());

		act(() => {
			result.current.setActiveItem(mockDragItem);
		});
		expect(result.current.activeItem).toEqual(mockDragItem);

		act(() => {
			result.current.clearActiveItem();
		});
		expect(result.current.activeItem).toBeUndefined();
	});
});
