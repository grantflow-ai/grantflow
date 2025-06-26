import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDebounce, useDebounce } from "./debounce";

describe("createDebounce", () => {
	it("should call the callback after the specified delay", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 1000);

		debounced.call("test");

		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(999);
		});
		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(callback).toHaveBeenCalledWith("test");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("should cancel pending calls", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 1000);

		debounced.call("test");
		expect(callback).not.toHaveBeenCalled();

		debounced.cancel();

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(callback).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("should reset the timer on multiple rapid calls", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 1000);

		debounced.call("first");
		act(() => {
			vi.advanceTimersByTime(500);
		});

		debounced.call("second");
		act(() => {
			vi.advanceTimersByTime(500);
		});

		debounced.call("third");

		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(500);
		});
		expect(callback).toHaveBeenCalledWith("third");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("should handle multiple arguments correctly", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 500);

		debounced.call("arg1", "arg2", "arg3");

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledWith("arg1", "arg2", "arg3");

		vi.useRealTimers();
	});

	it("should handle different argument types", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 500);

		const objArg = { key: "value" };
		const arrArg = [1, 2, 3];
		debounced.call(123, "string", true, objArg, arrArg);

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledWith(123, "string", true, objArg, arrArg);

		vi.useRealTimers();
	});

	it("should handle multiple cancel calls safely", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 1000);

		debounced.cancel();
		debounced.cancel();

		debounced.call("test");
		debounced.cancel();
		debounced.cancel();

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(callback).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("should allow new calls after cancellation", () => {
		vi.useFakeTimers();
		const callback = vi.fn();
		const debounced = createDebounce(callback, 500);

		debounced.call("first");
		debounced.cancel();

		debounced.call("second");

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledWith("second");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});
});

describe("useDebounce", () => {
	it("should debounce function calls in a React component", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { result } = renderHook(() => useDebounce(callback, 1000));

		act(() => {
			result.current("test");
		});

		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(999);
		});
		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(callback).toHaveBeenCalledWith("test");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("should reset timer on multiple rapid calls", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { result } = renderHook(() => useDebounce(callback, 1000));

		act(() => {
			result.current("first");
		});

		act(() => {
			vi.advanceTimersByTime(500);
		});

		act(() => {
			result.current("second");
		});

		act(() => {
			vi.advanceTimersByTime(500);
		});

		act(() => {
			result.current("third");
		});

		act(() => {
			vi.advanceTimersByTime(999);
		});

		expect(callback).not.toHaveBeenCalled();

		act(() => {
			vi.advanceTimersByTime(1);
		});

		expect(callback).toHaveBeenCalledWith("third");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("should update when callback changes", () => {
		vi.useFakeTimers();
		const callback1 = vi.fn();
		const callback2 = vi.fn();

		const { rerender, result } = renderHook(({ callback, delay }) => useDebounce(callback, delay), {
			initialProps: { callback: callback1, delay: 1000 },
		});

		act(() => {
			result.current("test1");
		});

		rerender({ callback: callback2, delay: 1000 });

		act(() => {
			result.current("test2");
		});

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(callback1).not.toHaveBeenCalled();
		expect(callback2).toHaveBeenCalledWith("test2");

		vi.useRealTimers();
	});

	it("should update when delay changes", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { rerender, result } = renderHook(({ callback, delay }) => useDebounce(callback, delay), {
			initialProps: { callback, delay: 1000 },
		});

		act(() => {
			result.current("test1");
		});

		act(() => {
			vi.advanceTimersByTime(500);
		});

		rerender({ callback, delay: 500 });

		act(() => {
			result.current("test2");
		});

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledWith("test2");
		expect(callback).toHaveBeenCalledTimes(1);

		vi.useRealTimers();
	});

	it("should cleanup on unmount", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { result, unmount } = renderHook(() => useDebounce(callback, 1000));

		act(() => {
			result.current("test");
		});

		unmount();

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(callback).not.toHaveBeenCalled();

		vi.useRealTimers();
	});

	it("should handle multiple arguments", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { result } = renderHook(() => useDebounce(callback, 500));

		act(() => {
			result.current("arg1", "arg2", "arg3");
		});

		act(() => {
			vi.advanceTimersByTime(500);
		});

		expect(callback).toHaveBeenCalledWith("arg1", "arg2", "arg3");

		vi.useRealTimers();
	});

	it("should handle zero delay", () => {
		vi.useFakeTimers();
		const callback = vi.fn();

		const { result } = renderHook(() => useDebounce(callback, 0));

		act(() => {
			result.current("test");
		});

		act(() => {
			vi.runAllTimers();
		});

		expect(callback).toHaveBeenCalledWith("test");

		vi.useRealTimers();
	});

	it("should maintain stable reference across renders", () => {
		const callback = vi.fn();

		const { rerender, result } = renderHook(
			({ value }) => {
				const debouncedFn = useDebounce(callback, 1000);
				return { debouncedFn, value };
			},
			{ initialProps: { value: 1 } },
		);

		const firstDebounced = result.current.debouncedFn;

		rerender({ value: 2 });

		expect(result.current.debouncedFn).toBe(firstDebounced);
	});
});
