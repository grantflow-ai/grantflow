import { renderHook } from "@testing-library/react";
import { act } from "react";
import { useControllableState } from "./use-controllable-state";

describe("useControllableState", () => {
	it("should use the controlled prop when provided", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControllableState({ prop: "controlled", onChange }));

		expect(result.current[0]).toBe("controlled");
	});

	it("should use the default prop when uncontrolled", () => {
		const { result } = renderHook(() => useControllableState({ defaultProp: "default" }));

		expect(result.current[0]).toBe("default");
	});

	it("should update the state when setValue is called (uncontrolled)", () => {
		const { result } = renderHook(() => useControllableState({ defaultProp: "initial" }));

		act(() => {
			result.current[1]("updated");
		});

		expect(result.current[0]).toBe("updated");
	});

	it("should call onChange when setValue is called (controlled)", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControllableState({ prop: "controlled", onChange }));

		act(() => {
			result.current[1]("updated");
		});

		expect(onChange).toHaveBeenCalledWith("updated");
		expect(result.current[0]).toBe("controlled");
	});

	it("should not call onChange when setting the same value (controlled)", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControllableState({ prop: "controlled", onChange }));

		act(() => {
			result.current[1]("controlled");
		});

		expect(onChange).not.toHaveBeenCalled();
	});

	it("should handle function updates correctly (uncontrolled)", () => {
		const { result } = renderHook(() => useControllableState({ defaultProp: 5 }));

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1);
		});

		expect(result.current[0]).toBe(6);
	});

	it("should handle function updates correctly (controlled)", () => {
		const onChange = vi.fn();
		const { result } = renderHook(() => useControllableState({ prop: 5, onChange }));

		act(() => {
			result.current[1]((prev) => (prev ?? 0) + 1);
		});

		expect(onChange).toHaveBeenCalledWith(6);
		expect(result.current[0]).toBe(5);
	});

	it("should not trigger unnecessary rerenders", () => {
		const renderSpy = vi.fn();
		const { rerender } = renderHook(
			({ prop }) => {
				renderSpy();
				return useControllableState({ prop });
			},
			{ initialProps: { prop: "initial" } },
		);

		expect(renderSpy).toHaveBeenCalledTimes(1);

		rerender({ prop: "initial" });
		expect(renderSpy).toHaveBeenCalledTimes(2);

		rerender({ prop: "updated" });
		expect(renderSpy).toHaveBeenCalledTimes(3);
	});

	it("should work with undefined values", () => {
		const { result } = renderHook(() => useControllableState({ prop: undefined, defaultProp: "default" }));

		expect(result.current[0]).toBe("default");

		act(() => {
			result.current[1](undefined);
		});

		expect(result.current[0]).toBe(undefined);
	});
});
