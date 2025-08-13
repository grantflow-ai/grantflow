import { beforeEach } from "vitest";

export const mockEnv = {
	DATABASE_URL: "postgresql://test:test@localhost:5432/crdt_test",
	NODE_ENV: "development" as const,
	PORT: "8080",
} satisfies Record<string, string>;

// Set environment variables immediately
Object.assign(process.env, mockEnv);

beforeEach(() => {
	Object.assign(process.env, mockEnv);
});