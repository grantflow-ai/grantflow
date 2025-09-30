import { act, renderHook } from "@testing-library/react";
import { useSupportModalStore } from "./support-modal-store";

describe("useSupportModalStore", () => {
	it("should have an initial state of isOpen being false", () => {
		const { result } = renderHook(() => useSupportModalStore());
		expect(result.current.isOpen).toBe(false);
	});

	it("should set isOpen to true when openModal is called", () => {
		const { result } = renderHook(() => useSupportModalStore());

		act(() => {
			result.current.openModal();
		});

		expect(result.current.isOpen).toBe(true);
	});

	it("should set isOpen to false when closeModal is called", () => {
		const { result } = renderHook(() => useSupportModalStore());

		// First, open the modal
		act(() => {
			result.current.openModal();
		});
		expect(result.current.isOpen).toBe(true);

		// Then, close it
		act(() => {
			result.current.closeModal();
		});
		expect(result.current.isOpen).toBe(false);
	});
});
