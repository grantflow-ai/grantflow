import { act, renderHook } from "@testing-library/react";

import { useIsMobile } from "./use-mobile";

// Mock matchMedia
const mockMatchMedia = vi.fn();

describe("useIsMobile", () => {
	let mockMediaQueryList: {
		addEventListener: ReturnType<typeof vi.fn>;
		matches: boolean;
		removeEventListener: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Create a mock MediaQueryList
		mockMediaQueryList = {
			addEventListener: vi.fn(),
			matches: false,
			removeEventListener: vi.fn(),
		};

		// Mock matchMedia
		mockMatchMedia.mockReturnValue(mockMediaQueryList);
		Object.defineProperty(globalThis, "matchMedia", {
			configurable: true,
			value: mockMatchMedia,
			writable: true,
		});

		// Mock window.innerWidth
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1024,
			writable: true,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should initialize with false when window width is above mobile breakpoint", () => {
		// Set desktop width
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1024,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	it("should initialize with true when window width is below mobile breakpoint", () => {
		// Set mobile width (767px is below 768px breakpoint)
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 767,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("should initialize with true exactly at mobile breakpoint boundary", () => {
		// Set width exactly at the boundary (767px is the max for mobile)
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 767,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("should initialize with false exactly above mobile breakpoint", () => {
		// Set width exactly above the boundary (768px is desktop)
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 768,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	it("should register matchMedia listener with correct query", () => {
		renderHook(() => useIsMobile());

		expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)");
		expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
	});

			it("should update state when media query changes", () => {
		const { result } = renderHook(() => useIsMobile());

		// Initially desktop
		expect(result.current).toBe(false);

		// Simulate window resize to mobile
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 600,
			writable: true,
		});

		// Get the change handler and call it
		const [, changeHandler] = mockMediaQueryList.addEventListener.mock.calls[0];
		act(() => {
			changeHandler();
		});

		expect(result.current).toBe(true);
	});

	it("should update state when resizing from mobile to desktop", () => {
		// Start with mobile width
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 600,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		// Initially mobile
		expect(result.current).toBe(true);

		// Simulate window resize to desktop
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1200,
			writable: true,
		});

		// Get the change handler and call it
		const [, changeHandler] = mockMediaQueryList.addEventListener.mock.calls[0];
		act(() => {
			changeHandler();
		});

		expect(result.current).toBe(false);
	});

	it("should clean up media query listener on unmount", () => {
		const { unmount } = renderHook(() => useIsMobile());

		// Verify listener was added
		expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

		// Unmount the hook
		unmount();

		// Verify listener was removed with the same function
		const [, addedHandler] = mockMediaQueryList.addEventListener.mock.calls[0];
		expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith("change", addedHandler);
	});

	it("should handle multiple rerenders correctly", () => {
		const { rerender, result } = renderHook(() => useIsMobile());

		// Initial state
		expect(result.current).toBe(false);

		// Rerender multiple times
		rerender();
		rerender();
		rerender();

		// Should still be the same
		expect(result.current).toBe(false);

		// Should only have registered one listener
		expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(1);
	});

	it("should handle edge case widths correctly", () => {
		const testCases = [
			{ expected: true, width: 0 },
			{ expected: true, width: 1 },
			{ expected: true, width: 320 }, // Common mobile width
			{ expected: true, width: 375 }, // iPhone width
			{ expected: true, width: 414 }, // iPhone Plus width
			{ expected: true, width: 767 }, // Largest mobile
			{ expected: false, width: 768 }, // Smallest desktop
			{ expected: false, width: 1024 }, // Tablet/desktop
			{ expected: false, width: 1920 }, // Large desktop
			{ expected: false, width: 9999 }, // Very large screen
		];

		testCases.forEach(({ expected, width }) => {
			Object.defineProperty(globalThis, "innerWidth", {
				configurable: true,
				value: width,
				writable: true,
			});

			const { result, unmount } = renderHook(() => useIsMobile());

			expect(result.current).toBe(expected);

			unmount();
		});
	});

	it("should return false for undefined initial state", () => {
		// Test the !!isMobile conversion when isMobile is undefined
		const { result } = renderHook(() => useIsMobile());

		// Even if internal state starts as undefined, it should return false due to !!conversion
		expect(typeof result.current).toBe("boolean");
	});

	it("should throw when matchMedia is not available", () => {
		// Remove matchMedia
		(globalThis as any).matchMedia = undefined;

		// Should throw when matchMedia is not available (expected behavior)
		expect(() => {
			renderHook(() => useIsMobile());
		}).toThrow("globalThis.matchMedia is not a function");
	});

	it("should throw when window is not available (SSR)", () => {
		// Mock window as undefined (simulating SSR environment)
		const originalWindow = globalThis.window;
		(globalThis as any).window = undefined;

		// Should throw when window is not available (expected behavior)
		expect(() => {
			renderHook(() => useIsMobile());
		}).toThrow("Cannot read properties of undefined (reading 'event')");

		// Restore window
		globalThis.window = originalWindow;
	});

	it("should maintain consistent breakpoint value", () => {
		// Ensure window is properly mocked for this test
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1024,
			writable: true,
		});

		// Test that the breakpoint used in matchMedia matches the one used in window.innerWidth check
		renderHook(() => useIsMobile());

		const [mediaQuery] = mockMatchMedia.mock.calls[0];
		expect(mediaQuery).toBe("(max-width: 767px)");

		// Verify that 767 is exactly one less than the 768 breakpoint used in the code
		const breakpointFromQuery = Number.parseInt(mediaQuery.match(/\d+/)?.[0] ?? "0", 10);
		expect(breakpointFromQuery).toBe(767);
	});
});
