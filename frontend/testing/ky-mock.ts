import { vi } from "vitest";

// Create a mock ky instance
export const createMockKyInstance = () => {
	const mockInstance = {
		blob: vi.fn().mockResolvedValue(new Blob()),
		create: vi.fn(),
		delete: vi.fn(),
		// Add common ky methods
		extend: vi.fn(),
		get: vi.fn(),
		json: vi.fn().mockResolvedValue({}),
		patch: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		text: vi.fn().mockResolvedValue(""),
	};

	// Make HTTP methods chainable - they should return the mockInstance
	const httpMethods = ["get", "post", "put", "patch", "delete"];
	httpMethods.forEach((method) => {
		mockInstance[method as keyof typeof mockInstance] = vi.fn().mockReturnValue(mockInstance);
	});

	// Make other methods return appropriate values
	mockInstance.extend.mockReturnValue(mockInstance);
	mockInstance.create.mockReturnValue(mockInstance);

	return mockInstance;
};

// Create the main mock ky instance
const mainMockKy = createMockKyInstance();

// Mock ky.create to return our mock instance
export const mockKy = {
	...mainMockKy,
	create: vi.fn(() => createMockKyInstance()),
};

// Mock HTTPError class
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
		// Ensure status code is within valid range (200-599)
		const validStatusCode = Math.max(200, Math.min(599, statusCode));
		const response = new Response(null, {
			status: validStatusCode,
			statusText: message ?? "Error",
		});
		const request = new Request("http://localhost");
		return new MockHTTPError(response, request);
	}
}

// Set up the mock
vi.mock("ky", () => ({
	default: mockKy,
	HTTPError: MockHTTPError,
}));
