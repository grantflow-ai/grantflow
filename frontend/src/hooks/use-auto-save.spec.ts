import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "./use-auto-save";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe("useAutoSave", () => {
	it("should not call the callback on initial render", () => {
		const callback = vi.fn();
		renderHook(() => useAutoSave(callback, []));
		expect(callback).not.toHaveBeenCalled();
	});

	it("should call the callback after dependencies change and delay passes", () => {
		const callback = vi.fn();
		const { rerender } = renderHook(({ deps }) => useAutoSave(callback, deps, 1000), {
			initialProps: { deps: ["initial"] },
		});

		rerender({ deps: ["updated"] });

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(callback).toHaveBeenCalledTimes(1);
	});

	it("should debounce the callback correctly", () => {
		const callback = vi.fn();
		const { rerender } = renderHook(({ deps }) => useAutoSave(callback, deps, 1000), {
			initialProps: { deps: ["initial"] },
		});

		rerender({ deps: ["updated"] });

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).not.toHaveBeenCalled();

		rerender({ deps: ["updated again"] });

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledTimes(1);
	});
});
