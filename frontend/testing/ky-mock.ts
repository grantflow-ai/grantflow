import { vi } from "vitest";

// Create a mock ky instance
export const createMockKyInstance = () => {
	const mockInstance = {
		blob: vi.fn().mockResolvedValue(new Blob()),
		delete: vi.fn().mockReturnThis(),
		get: vi.fn().mockReturnThis(),
		json: vi.fn().mockResolvedValue({}),
		patch: vi.fn().mockReturnThis(),
		post: vi.fn().mockReturnThis(),
		put: vi.fn().mockReturnThis(),
		text: vi.fn().mockResolvedValue(""),
	};

	// Make chainable
	Object.keys(mockInstance).forEach((key) => {
		if (key !== "json" && key !== "text" && key !== "blob") {
			mockInstance[key as keyof typeof mockInstance].mockReturnValue(mockInstance);
		}
	});

	return mockInstance;
};

// Mock ky.create to return our mock instance
export const mockKy = {
	create: vi.fn(() => createMockKyInstance()),
};

// Set up the mock
vi.mock("ky", () => ({
	default: mockKy,
}));
