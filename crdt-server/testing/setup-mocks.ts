import { vi } from "vitest";

vi.mock("@/db", () => ({
	db: {
		delete: vi.fn(),
		insert: vi.fn(),
		select: vi.fn(),
		update: vi.fn(),
	},
	editorDocuments: {},
}));

vi.mock("@/utils/logger", () => ({
	logger: {
		debug: vi.fn(),
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));
