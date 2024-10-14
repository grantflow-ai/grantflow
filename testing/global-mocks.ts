import process from "node:process";

import { PagePath } from "@/enums";
import type { Env } from "@/types/env-types";
import { beforeEach, vi } from "vitest";

const { mockUsePathname, mockRedirect, mockUseRouter, mockToast } = vi.hoisted(() => {
	const mockToast = vi.fn();
	Reflect.set(mockToast, "error", vi.fn());
	Reflect.set(mockToast, "success", vi.fn());
	Reflect.set(mockToast, "info", vi.fn());
	Reflect.set(mockToast, "promise", vi.fn());

	return {
		mockUsePathname: vi.fn(),
		mockRedirect: vi.fn(),
		mockRefresh: vi.fn(),
		mockUseRouter: vi.fn().mockImplementation(() => ({
			refresh: vi.fn(),
			push: vi.fn(),
			replace: vi.fn(),
		})),
		mockToast,
	};
});

vi.mock("next/navigation", async (importOriginal) => {
	const original = await importOriginal();

	return {
		__esModule: true,
		...(original as Record<string, unknown>),
		useRouter: mockUseRouter,
		usePathname: mockUsePathname,
		redirect: mockRedirect,
	};
});

vi.mock("sonner", async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as Record<string, unknown>),
		toast: mockToast,
	};
});

export { mockUsePathname, mockRedirect, mockToast };

// see: https://github.com/jsdom/jsdom/issues/3294
export const mockShowModal = vi.fn();
export const mockShow = vi.fn();
export const mockClose = vi.fn();

// mock the fetch function
export const mockFetch = vi.fn();

// mock the env we expect
export const mockEnv = {
	AUTH_GOOGLE_ID: "client_id",
	AUTH_GOOGLE_SECRET: "secret",
	AUTH_RESEND_KEY: "resend_key",
	AUTH_SECRET: "secret",
	AZURE_STORAGE_ACCOUNT_KEY: "valid_key",
	AZURE_STORAGE_ACCOUNT_NAME: "account_name",
	AZURE_STORAGE_CONTAINER_NAME: "container_name",
	DATABASE_CONNECTION_STRING: "connection_string",
	NEXT_PUBLIC_DEBUG: true,
	NEXT_PUBLIC_SITE_URL: "https://example.com",
} satisfies Env;

beforeAll(() => {
	HTMLDialogElement.prototype.close = mockClose;
	HTMLDialogElement.prototype.show = mockShow;
	HTMLDialogElement.prototype.showModal = mockShowModal;
});

beforeEach(() => {
	mockClose.mockReset();
	mockRedirect.mockReset();
	mockShow.mockReset();
	mockShowModal.mockReset();
	mockToast.mockReset();
	mockUsePathname.mockReset().mockReturnValue(PagePath.ROOT);
	mockFetch.mockReset().mockResolvedValue({
		json: () => Promise.resolve({}),
		ok: true,
		status: 200,
	});
	globalThis.fetch = mockFetch;
	Object.assign(
		process.env,
		Object.fromEntries(Object.entries(mockEnv).map(([key, value]) => [key, value.toString()])),
	);
});
