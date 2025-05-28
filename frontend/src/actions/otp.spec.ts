import { HTTPError } from "ky";

import { mockRedirect } from "::testing/global-mocks";
import { API } from "@/types/api-types";

import { getOtp } from "./otp";

const mockGet = vi.fn();
const mockCreateAuthHeaders = vi.fn();
const mockWithAuthRedirect = vi.fn();

vi.mock("@/utils/api", async () => {
	const actual = await vi.importActual("@/utils/api");
	return {
		...actual,
		getClient: () => ({
			get: mockGet,
		}),
	};
});

vi.mock("@/utils/server-side", async () => {
	const actual = await vi.importActual("@/utils/server-side");
	return {
		...actual,
		createAuthHeaders: () => mockCreateAuthHeaders(),
		withAuthRedirect: (promise: Promise<any>) => mockWithAuthRedirect(promise),
	};
});

describe("OTP Actions", () => {
	const mockAuthHeaders = { Authorization: "Bearer mock-token" };

	const mockOtpResponse: API.GenerateOtp.Http200.ResponseBody = {
		otp: "123456",
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockCreateAuthHeaders.mockResolvedValue(mockAuthHeaders);
		mockWithAuthRedirect.mockImplementation((promise: Promise<any>) => promise);

		mockGet.mockReturnValue({
			json: vi.fn().mockResolvedValue(mockOtpResponse),
		});
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	describe("getOtp", () => {
		it("should call the API with correct parameters", async () => {
			const result = await getOtp();

			expect(mockGet).toHaveBeenCalledWith("otp", {
				headers: mockAuthHeaders,
			});

			expect(mockWithAuthRedirect).toHaveBeenCalled();
			expect(result).toEqual(mockOtpResponse);
		});

		it("should handle API errors correctly", async () => {
			const mockError = new Error("API Error");
			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(mockError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => promise);

			await expect(getOtp()).rejects.toThrow("API Error");
		});

		it("should redirect to sign-in page on 401 errors", async () => {
			const mockResponse = new Response(null, { status: 401 });
			const httpError = new HTTPError(mockResponse, { path: "otp" } as any, {} as any);

			mockGet.mockReturnValueOnce({
				json: vi.fn().mockRejectedValue(httpError),
			});

			mockWithAuthRedirect.mockImplementationOnce((promise: Promise<any>) => {
				return promise.catch((error: unknown) => {
					if (error instanceof HTTPError && error.response.status === 401) {
						mockRedirect("/signin");
						return null;
					}
					throw error;
				});
			});

			await getOtp();

			expect(mockRedirect).toHaveBeenCalledWith("/signin");
		});
	});
});
