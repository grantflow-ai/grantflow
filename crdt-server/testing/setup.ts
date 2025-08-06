import { vi } from "vitest";

vi.mock("@/db", () => ({
	db: {
		select: vi.fn(),
		update: vi.fn(),
	},
	editorDocuments: {},
}));

vi.mock("@/utils/logger", () => ({
	logger: {
		info: vi.fn(),
	},
}));
