import { act, renderHook } from "@testing-library/react";

import { useIsMobile } from "./use-mobile";

const mockMatchMedia = vi.fn();

describe("useIsMobile", () => {
	let mockMediaQueryList: {
		addEventListener: ReturnType<typeof vi.fn>;
		matches: boolean;
		removeEventListener: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockMediaQueryList = {
			addEventListener: vi.fn(),
			matches: false,
			removeEventListener: vi.fn(),
		};

		mockMatchMedia.mockReturnValue(mockMediaQueryList);
		Object.defineProperty(globalThis, "matchMedia", {
			configurable: true,
			value: mockMatchMedia,
			writable: true,
		});

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
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1024,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);
	});

	it("should initialize with true when window width is below mobile breakpoint", () => {
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 767,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("should initialize with true exactly at mobile breakpoint boundary", () => {
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 767,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);
	});

	it("should initialize with false exactly above mobile breakpoint", () => {
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

		expect(result.current).toBe(false);

		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 600,
			writable: true,
		});

		const [[, changeHandler]] = mockMediaQueryList.addEventListener.mock.calls;
		act(() => {
			changeHandler();
		});

		expect(result.current).toBe(true);
	});

	it("should update state when resizing from mobile to desktop", () => {
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 600,
			writable: true,
		});

		const { result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(true);

		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1200,
			writable: true,
		});

		const [[, changeHandler]] = mockMediaQueryList.addEventListener.mock.calls;
		act(() => {
			changeHandler();
		});

		expect(result.current).toBe(false);
	});

	it("should clean up media query listener on unmount", () => {
		const { unmount } = renderHook(() => useIsMobile());

		expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

		unmount();

		const [[, addedHandler]] = mockMediaQueryList.addEventListener.mock.calls;
		expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith("change", addedHandler);
	});

	it("should handle multiple rerenders correctly", () => {
		const { rerender, result } = renderHook(() => useIsMobile());

		expect(result.current).toBe(false);

		rerender();
		rerender();
		rerender();

		expect(result.current).toBe(false);

		expect(mockMediaQueryList.addEventListener).toHaveBeenCalledTimes(1);
	});

	it("should handle edge case widths correctly", () => {
		const testCases = [
			{ expected: true, width: 0 },
			{ expected: true, width: 1 },
			{ expected: true, width: 320 },
			{ expected: true, width: 375 },
			{ expected: true, width: 414 },
			{ expected: true, width: 767 },
			{ expected: false, width: 768 },
			{ expected: false, width: 1024 },
			{ expected: false, width: 1920 },
			{ expected: false, width: 9999 },
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
		const { result } = renderHook(() => useIsMobile());

		expect(typeof result.current).toBe("boolean");
	});

	it("should throw when matchMedia is not available", () => {
		(globalThis as any).matchMedia = undefined;

		expect(() => {
			renderHook(() => useIsMobile());
		}).toThrow("globalThis.matchMedia is not a function");
	});

	it("should throw when window is not available (SSR)", () => {
		const originalWindow = globalThis.window;
		(globalThis as any).window = undefined;

		expect(() => {
			renderHook(() => useIsMobile());
		}).toThrow("Cannot read properties of undefined (reading 'event')");

		globalThis.window = originalWindow;
	});

	it("should maintain consistent breakpoint value", () => {
		Object.defineProperty(globalThis, "innerWidth", {
			configurable: true,
			value: 1024,
			writable: true,
		});

		renderHook(() => useIsMobile());

		const [[mediaQuery]] = mockMatchMedia.mock.calls;
		expect(mediaQuery).toBe("(max-width: 767px)");

		const breakpointFromQuery = Number.parseInt(mediaQuery.match(/\d+/)?.[0] ?? "0", 10);
		expect(breakpointFromQuery).toBe(767);
	});
});