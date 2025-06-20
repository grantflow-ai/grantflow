import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useWizardStore } from "@/stores/wizard-store";

vi.mock("@/stores/wizard-store");

describe("usePollingCleanup", () => {
	const mockStop = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useWizardStore).mockImplementation((selector?: any) => {
			const state = {
				polling: {
					stop: mockStop,
				},
			};
			return selector ? selector(state) : state;
		});
	});

	it("should not call stop on mount", () => {
		renderHook(() => usePollingCleanup());

		expect(mockStop).not.toHaveBeenCalled();
	});

	it("should call stop on unmount", () => {
		const { unmount } = renderHook(() => usePollingCleanup());

		expect(mockStop).not.toHaveBeenCalled();

		unmount();

		expect(mockStop).toHaveBeenCalledTimes(1);
	});

	it("should handle multiple instances", () => {
		const { unmount: unmount1 } = renderHook(() => usePollingCleanup());
		const { unmount: unmount2 } = renderHook(() => usePollingCleanup());

		expect(mockStop).not.toHaveBeenCalled();

		unmount1();
		expect(mockStop).toHaveBeenCalledTimes(1);

		unmount2();
		expect(mockStop).toHaveBeenCalledTimes(2);
	});

	it("should use the same selector across renders", () => {
		const selectorSpy = vi.fn((state: any) => state.polling.stop);

		vi.mocked(useWizardStore).mockImplementation((selector?: any) => {
			const state = {
				polling: {
					stop: mockStop,
				},
			};
			if (selector) {
				selectorSpy(state);
				return selector(state);
			}
			return state;
		});

		const { rerender } = renderHook(() => usePollingCleanup());

		expect(selectorSpy).toHaveBeenCalledTimes(1);

		rerender();

		expect(selectorSpy).toHaveBeenCalledTimes(2);

		expect(selectorSpy.mock.results[0].value).toBe(mockStop);
		expect(selectorSpy.mock.results[1].value).toBe(mockStop);
	});
});
