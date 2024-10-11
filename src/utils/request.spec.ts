import { ErrorType } from "@/constants";
import { errorRedirect } from "@/utils/request";
import { NextResponse } from "next/server";

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

		expect(mockUrl.searchParams.get("error")).toBe(ErrorType.UNEXPECTED_ERROR);

		expect(NextResponse.redirect).toHaveBeenCalledWith(mockUrl);
		expect(result).toBe(NextResponse.redirect(mockUrl));
	});
});
