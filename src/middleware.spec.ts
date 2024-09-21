import { describe, it, expect, vi, beforeEach } from "vitest";
import { middleware, config } from "./middleware";
import { i18nMiddleware } from "@/middleware/i18n-middleware";
import { updateSession } from "@/middleware/auth";
import { type NextRequest, NextResponse } from "next/server";

vi.mock("@/middleware/i18n-middleware");
vi.mock("@/middleware/auth");

describe("middleware", () => {
	let mockRequest: NextRequest;

	beforeEach(() => {
		mockRequest = {} as NextRequest;
		vi.resetAllMocks();
	});

	it("should return i18nMiddleware response if status is not 200", async () => {
		const mockI18nResponse = { status: 301, headers: new Headers() } as NextResponse;
		vi.mocked(i18nMiddleware).mockReturnValue(mockI18nResponse);

		const result = await middleware(mockRequest);

		expect(i18nMiddleware).toHaveBeenCalledWith(mockRequest);
		expect(updateSession).not.toHaveBeenCalled();
		expect(result).toBe(mockI18nResponse);
	});

	it("should call updateSession if i18nMiddleware status is 200", async () => {
		const mockI18nResponse = NextResponse.next();
		const mockUpdateSessionResponse = NextResponse.next();
		Object.defineProperty(mockI18nResponse, "status", { value: 200, writable: false });
		Object.defineProperty(mockUpdateSessionResponse, "status", { value: 200, writable: false });
		vi.mocked(i18nMiddleware).mockReturnValue(mockI18nResponse);
		vi.mocked(updateSession).mockResolvedValue(mockUpdateSessionResponse);

		const result = await middleware(mockRequest);

		expect(i18nMiddleware).toHaveBeenCalledWith(mockRequest);
		expect(updateSession).toHaveBeenCalledWith(mockRequest);
		expect(result).toBe(mockUpdateSessionResponse);
	});
});

describe("config", () => {
	it("should have the correct matcher", () => {
		expect(config.matcher).toEqual(["/((?!_next/static|_next/image|icon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]);
	});
});
