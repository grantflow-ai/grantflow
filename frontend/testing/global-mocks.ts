import type { Env } from "@/types/env-types";

import { PagePath } from "@/enums";
import process from "node:process";
import { beforeEach, vi } from "vitest";

const { mockRedirect, mockToast, mockUsePathname, mockUseRouter } = vi.hoisted(() => {
	const mockToast = vi.fn();
	Reflect.set(mockToast, "error", vi.fn());
	Reflect.set(mockToast, "success", vi.fn());
	Reflect.set(mockToast, "info", vi.fn());
	Reflect.set(mockToast, "promise", vi.fn());

	return {
		mockRedirect: vi.fn(),
		mockRefresh: vi.fn(),
		mockToast,
		mockUsePathname: vi.fn(),
		mockUseRouter: vi.fn().mockImplementation(() => ({
			push: vi.fn(),
			refresh: vi.fn(),
			replace: vi.fn(),
		})),
	};
});

vi.mock("next/navigation", async (importOriginal) => {
	const original = await importOriginal();

	return {
		__esModule: true,
		...(original as Record<string, unknown>),
		redirect: mockRedirect,
		usePathname: mockUsePathname,
		useRouter: mockUseRouter,
	};
});

vi.mock("sonner", async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as Record<string, unknown>),
		toast: mockToast,
	};
});

export { mockRedirect, mockToast, mockUsePathname };

// see: https://github.com/jsdom/jsdom/issues/3294
export const mockShowModal = vi.fn();
export const mockShow = vi.fn();
export const mockClose = vi.fn();

export const mockFetch = vi.fn();

export const mockEnv = {
	NEXT_PUBLIC_BACKEND_API_BASE_URL: "https://api.dev.acmetech.io",
	NEXT_PUBLIC_DEBUG: true,
	NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
	NEXT_PUBLIC_FIREBASE_APP_ID: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "acmetech-dev.firebaseapp.com",
	NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XYZ123ABC4",
	NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "847362514908",
	NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: "72a88c64-9b3d-4e5f-8c7a-1b2d3e4f5a6b",
	NEXT_PUBLIC_FIREBASE_PROJECT_ID: "acmetech-dev",
	NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "acmetech-dev.appspot.com",
	NEXT_PUBLIC_SITE_URL: "https://app.acmetech.io",
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
