import { render } from "@testing-library/react";
import { ToastListener } from "./toast-listener";
import { toast } from "sonner";

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
	const mockRouter = { replace: vi.fn() };

	beforeEach(() => {
		vi.clearAllMocks();
		// @ts-expect-error, mocking
		vi.mocked(useRouter).mockReturnValue(mockRouter);
	});

	it("does nothing when no toast params are present", () => {
		// @ts-expect-error, mocking
		vi.mocked(useSearchParams).mockReturnValue({
			get: vi.fn().mockReturnValue(null),
			toString: vi.fn().mockReturnValue(""),
		});

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
		// @ts-expect-error, mocking
		vi.mocked(useSearchParams).mockReturnValue({
			get: (key: string) => mockParams.get(key) ?? null,
			toString: () => "toastType=success&toastContent=Operation+completed+successfully&otherParam=value",
		});

		render(<ToastListener />);

		expect(toast.success).toHaveBeenCalledWith("Operation completed successfully");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?otherParam=value", { scroll: false });
	});

	it("shows error toast and redirects when error toast params are present", () => {
		const mockParams = new Map([
			["toastContent", "Something went wrong"],
			["toastType", "error"],
		]);
		// @ts-expect-error, mocking
		vi.mocked(useSearchParams).mockReturnValue({
			get: (key: string) => mockParams.get(key) ?? null,
			toString: () => "toastType=error&toastContent=Something+went+wrong",
		});

		render(<ToastListener />);

		expect(toast.error).toHaveBeenCalledWith("Something went wrong");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});

	it("shows info toast and redirects when info toast params are present", () => {
		const mockParams = new Map([
			["toastContent", "Please note this information"],
			["toastType", "info"],
		]);
		// @ts-expect-error, mocking
		vi.mocked(useSearchParams).mockReturnValue({
			get: (key: string) => mockParams.get(key) ?? null,
			toString: () => "toastType=info&toastContent=Please+note+this+information",
		});

		render(<ToastListener />);

		expect(toast.info).toHaveBeenCalledWith("Please note this information");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});

	it("handles empty toast content", () => {
		const mockParams = new Map([
			["toastContent", ""],
			["toastType", "success"],
		]);
		// @ts-expect-error, mocking
		vi.mocked(useSearchParams).mockReturnValue({
			get: (key: string) => mockParams.get(key) ?? null,
			toString: () => "toastType=success&toastContent=",
		});

		render(<ToastListener />);

		expect(toast.success).toHaveBeenCalledWith("");
		expect(mockRouter.replace).toHaveBeenCalledWith("/?", { scroll: false });
	});
});

import { useRouter, useSearchParams } from "next/navigation";
