import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePollingCleanup } from "@/hooks/use-polling-cleanup";
import { useWizardStore } from "@/stores/wizard-store";

describe("usePollingCleanup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		useWizardStore.setState({
			polling: {
				intervalId: null,
				isActive: false,
				start: vi.fn(),
				stop: vi.fn(),
			},
			setGeneratingTemplate: vi.fn(),
		});
	});

	it("should not call stop on mount", () => {
		const stopSpy = vi.spyOn(useWizardStore.getState().polling, "stop");

		renderHook(() => usePollingCleanup());

		expect(stopSpy).not.toHaveBeenCalled();
	});

	it("should call stop on unmount", () => {
		const stopSpy = vi.spyOn(useWizardStore.getState().polling, "stop");
		const setGeneratingTemplateSpy = vi.spyOn(useWizardStore.getState(), "setGeneratingTemplate");
		const { unmount } = renderHook(() => usePollingCleanup());

		expect(stopSpy).not.toHaveBeenCalled();
		expect(setGeneratingTemplateSpy).not.toHaveBeenCalled();

		unmount();

		expect(stopSpy).toHaveBeenCalledTimes(1);
		expect(setGeneratingTemplateSpy).toHaveBeenCalledTimes(1);
		expect(setGeneratingTemplateSpy).toHaveBeenCalledWith(false);
	});

	it("should handle multiple instances", () => {
		const stopSpy = vi.spyOn(useWizardStore.getState().polling, "stop");
		const setGeneratingTemplateSpy = vi.spyOn(useWizardStore.getState(), "setGeneratingTemplate");
		const { unmount: unmount1 } = renderHook(() => usePollingCleanup());
		const { unmount: unmount2 } = renderHook(() => usePollingCleanup());

		expect(stopSpy).not.toHaveBeenCalled();
		expect(setGeneratingTemplateSpy).not.toHaveBeenCalled();

		unmount1();
		expect(stopSpy).toHaveBeenCalledTimes(1);
		expect(setGeneratingTemplateSpy).toHaveBeenCalledTimes(1);

		unmount2();
		expect(stopSpy).toHaveBeenCalledTimes(2);
		expect(setGeneratingTemplateSpy).toHaveBeenCalledTimes(2);
	});
});
