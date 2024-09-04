import { renderHook } from "@testing-library/react";
import { useCallbackRef } from "./use-callback-ref";

describe("useCallbackRef", () => {
	it("should return a stable reference", () => {
		const callback = vi.fn();
		const { result, rerender } = renderHook(() => useCallbackRef(callback));

		const initialRef = result.current;
		rerender();
		expect(result.current).toBe(initialRef);
	});

	it("should call the latest callback", () => {
		const initialCallback = vi.fn();
		const { result, rerender } = renderHook(({ cb }) => useCallbackRef(cb), {
			initialProps: { cb: initialCallback },
		});

		result.current();
		expect(initialCallback).toHaveBeenCalledTimes(1);

		const newCallback = vi.fn();
		rerender({ cb: newCallback });

		result.current();
		expect(initialCallback).toHaveBeenCalledTimes(1);
		expect(newCallback).toHaveBeenCalledTimes(1);
	});

	it("should pass arguments to the callback", () => {
		const callback = vi.fn();
		const { result } = renderHook(() => useCallbackRef(callback));

		result.current(1, "test", { foo: "bar" });
		expect(callback).toHaveBeenCalledWith(1, "test", { foo: "bar" });
	});

	it("should handle undefined callback", () => {
		const { result } = renderHook(() => useCallbackRef(undefined));

		expect(() => result.current()).not.toThrow();
	});

	it("should not trigger re-renders when passed as a prop", () => {
		const callback = vi.fn();
		const { result } = renderHook(() => useCallbackRef(callback));

		const initialRef = result.current;
		const { rerender } = renderHook(({ cb }) => cb, {
			initialProps: { cb: initialRef },
		});

		rerender({ cb: initialRef });
		expect(callback).not.toHaveBeenCalled();
	});
});
