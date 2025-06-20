import { render } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ToastListener } from "./toast-listener";

vi.mock("next/navigation", () => ({
	usePathname: vi.fn().mockReturnValue("/"),
	useRouter: vi.fn().mockReturnValue({
		replace: vi.fn(),
	}),
	useSearchParams: vi.fn().mockReturnValue({
		get: vi.fn(),
		toString: vi.fn(),
	}),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

describe("ToastListener", () => {
	const mockRouter = {
		back: vi.fn(),
		forward: vi.fn(),
		prefetch: vi.fn(),
		push: vi.fn(),
		refresh: vi.fn(),
		replace: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();

		vi.mocked(useRouter).mockReturnValue(mockRouter);
	});

	it("does nothing when no toast params are present", () => {
		vi.mocked(useSearchParams).mockReturnValue({
			append: vi.fn(),
			delete: vi.fn(),
			entries: vi.fn(),
			forEach: vi.fn(),
			get: vi.fn().mockReturnValue(null),
			getAll: vi.fn(),
			has: vi.fn(),
			keys: vi.fn(),
			set: vi.fn(),
			size: 0,
			sort: vi.fn(),
			[Symbol.iterator]: vi.fn(),
			toString: vi.fn().mockReturnValue(""),
			values: vi.fn(),
		} as ReadonlyURLSearchParams);

		render(<ToastListener />);

		expect(toast.success).not.toHaveBeenCalled();
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.info).not.toHaveBeenCalled();
		expect(mockRouter.replace).not.toHaveBeenCalled();
	});

	it("shows success toast and redirects when success toast params are present", () => {
		const mockParams = new Map([
			["otherParam", "value"],
			["toastContent", "Operation completed successfully"],
			["toastType", "success"],
		]);

		vi.mocked(useSearchParams).mockReturnValue({
			append: vi.fn(),
			delete: vi.fn(),
			entries: vi.fn(),
			forEach: vi.fn(),
			get: (key: string) => mockParams.get(key) ?? null,
			getAll: vi.fn(),
			has: vi.fn(),
			keys: vi.fn(),
			set: vi.fn(),
			size: 3,
			sort: vi.fn(),
			[Symbol.iterator]: vi.fn(),
			toString: () => "toastType=success&toastContent=Operation+completed+successfully&otherParam=value",
			values: vi.fn(),
		} as ReadonlyURLSearchParams);

		render(<ToastListener />);

		expect(toast.success).toHaveBeenCalledWith("Operation completed successfully");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?otherParam=value", { scroll: false });
	});

	it("shows error toast and redirects when error toast params are present", () => {
		const mockParams = new Map([
			["toastContent", "Something went wrong"],
			["toastType", "error"],
		]);

		vi.mocked(useSearchParams).mockReturnValue({
			append: vi.fn(),
			delete: vi.fn(),
			entries: vi.fn(),
			forEach: vi.fn(),
			get: (key: string) => mockParams.get(key) ?? null,
			getAll: vi.fn(),
			has: vi.fn(),
			keys: vi.fn(),
			set: vi.fn(),
			size: 2,
			sort: vi.fn(),
			[Symbol.iterator]: vi.fn(),
			toString: () => "toastType=error&toastContent=Something+went+wrong",
			values: vi.fn(),
		} as ReadonlyURLSearchParams);

		render(<ToastListener />);

		expect(toast.error).toHaveBeenCalledWith("Something went wrong");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});

	it("shows info toast and redirects when info toast params are present", () => {
		const mockParams = new Map([
			["toastContent", "Please note this information"],
			["toastType", "info"],
		]);

		vi.mocked(useSearchParams).mockReturnValue({
			append: vi.fn(),
			delete: vi.fn(),
			entries: vi.fn(),
			forEach: vi.fn(),
			get: (key: string) => mockParams.get(key) ?? null,
			getAll: vi.fn(),
			has: vi.fn(),
			keys: vi.fn(),
			set: vi.fn(),
			size: 2,
			sort: vi.fn(),
			[Symbol.iterator]: vi.fn(),
			toString: () => "toastType=info&toastContent=Please+note+this+information",
			values: vi.fn(),
		} as ReadonlyURLSearchParams);

		render(<ToastListener />);

		expect(toast.info).toHaveBeenCalledWith("Please note this information");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});

	it("handles empty toast content", () => {
		const mockParams = new Map([
			["toastContent", ""],
			["toastType", "success"],
		]);

		vi.mocked(useSearchParams).mockReturnValue({
			append: vi.fn(),
			delete: vi.fn(),
			entries: vi.fn(),
			forEach: vi.fn(),
			get: (key: string) => mockParams.get(key) ?? null,
			getAll: vi.fn(),
			has: vi.fn(),
			keys: vi.fn(),
			set: vi.fn(),
			size: 2,
			sort: vi.fn(),
			[Symbol.iterator]: vi.fn(),
			toString: () => "toastType=success&toastContent=",
			values: vi.fn(),
		} as ReadonlyURLSearchParams);

		render(<ToastListener />);

		expect(toast.success).toHaveBeenCalledWith("");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});
});