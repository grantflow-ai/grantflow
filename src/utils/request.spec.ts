import { ErrorType } from "@/constants";
import { serverLogger } from "@/utils/logging/server";
import { errorRedirect } from "@/utils/request";
import { NextResponse } from "next/server";

vi.mock("@/utils/logging/server", () => ({
	serverLogger: {
		error: vi.fn(),
	},
}));

vi.mock("next/server", () => ({
	NextResponse: {
		redirect: vi.fn(),
	},
}));

describe("errorRedirect", () => {
	it("should log the error, set error in search params, and redirect", () => {
		const mockUrl = new URL("https://example.com");
		const mockError = new Error("Authentication failed");

		const result = errorRedirect({
			url: mockUrl,
			errorType: ErrorType.UNEXPECTED_ERROR,
			error: mockError,
		});

		expect(serverLogger.error).toHaveBeenCalledWith(`${ErrorType.UNEXPECTED_ERROR}: ${mockError.message}`);

		expect(mockUrl.searchParams.get("error")).toBe(ErrorType.UNEXPECTED_ERROR);

		expect(NextResponse.redirect).toHaveBeenCalledWith(mockUrl);
		expect(result).toBe(NextResponse.redirect(mockUrl));
	});
});
