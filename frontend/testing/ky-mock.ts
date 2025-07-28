import { vi } from "vitest";

export const createMockKyInstance = () => {
	const mockInstance = {
		blob: vi.fn().mockResolvedValue(new Blob()),
		create: vi.fn(),
		delete: vi.fn(),

		extend: vi.fn(),
		get: vi.fn(),
		json: vi.fn().mockResolvedValue({}),
		patch: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		text: vi.fn().mockResolvedValue(""),
	};

	const httpMethods = ["get", "post", "put", "patch", "delete"];
	httpMethods.forEach((method) => {
		mockInstance[method as keyof typeof mockInstance] = vi.fn().mockReturnValue(mockInstance);
	});

	mockInstance.extend.mockReturnValue(mockInstance);
	mockInstance.create.mockReturnValue(mockInstance);

	return mockInstance;
};

const mainMockKy = createMockKyInstance();

export const mockKy = {
	...mainMockKy,
	create: vi.fn(() => createMockKyInstance()),
};

export class MockHTTPError extends Error {
	options: any;
	request: Request;
	response: Response;

	constructor(response: Response, request: Request, options?: any) {
		const { status } = response;
		const statusText = response.statusText || "Unknown error";
		super(`Request failed with status ${status}: ${statusText}`);
		this.name = "HTTPError";
		this.response = response;
		this.request = request;
		this.options = options ?? {};
	}

	static create(statusCode = 500, message?: string): MockHTTPError {
		const validStatusCode = Math.max(200, Math.min(599, statusCode));
		const response = new Response(null, {
			status: validStatusCode,
			statusText: message ?? "Error",
		});
		const request = new Request("http://localhost");
		return new MockHTTPError(response, request);
	}
}

vi.mock("ky", () => ({
	default: mockKy,
	HTTPError: MockHTTPError,
}));
