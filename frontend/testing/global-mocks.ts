import process from "node:process";

import { toast } from "sonner";
import { beforeEach, Mock, vi } from "vitest";

import { PagePath } from "@/enums";

import type { Env } from "@/types/env-types";

const {
	mockCookies,
	mockRedirect,
	mockResizeObserver,
	mockSetCookie,
	mockToast,
	mockUsePathname,
	mockUseRouter,
	mockUseSearchParams,
} = vi.hoisted(() => {
	const mockToast = vi.fn() as {
		error: Mock;
		info: Mock;
		promise: Mock;
		success: Mock;
	} & Mock<typeof toast>;
	Reflect.set(mockToast, "error", vi.fn());
	Reflect.set(mockToast, "success", vi.fn());
	Reflect.set(mockToast, "info", vi.fn());
	Reflect.set(mockToast, "promise", vi.fn());

	const mockSetCookie = vi.fn();
	const mockCookies = vi.fn().mockImplementation(() =>
		Promise.resolve({
			set: mockSetCookie,
		}),
	);

	const mockResizeObserver = vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		unobserve: vi.fn(),
	}));

	return {
		mockCookies,
		mockRedirect: vi.fn(),
		mockRefresh: vi.fn(),
		mockResizeObserver,
		mockSetCookie,
		mockToast,
		mockUsePathname: vi.fn(),
		mockUseRouter: vi.fn().mockImplementation(() => ({
			push: vi.fn(),
			refresh: vi.fn(),
			replace: vi.fn(),
		})),
		mockUseSearchParams: vi.fn().mockImplementation(() => ({
			get: vi.fn().mockReturnValue(null),
			getAll: vi.fn().mockReturnValue([]),
			has: vi.fn().mockReturnValue(false),
			toString: vi.fn().mockReturnValue(""),
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
		useSearchParams: mockUseSearchParams,
	};
});

vi.mock("next/headers", () => ({
	cookies: mockCookies,
}));

vi.mock("sonner", async (importOriginal) => {
	const original = await importOriginal();
	return {
		...(original as Record<string, unknown>),
		toast: mockToast,
	};
});

export {
	mockCookies,
	mockRedirect,
	mockResizeObserver,
	mockSetCookie,
	mockToast,
	mockUsePathname,
	mockUseSearchParams,
};

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
	NEXT_PUBLIC_MAILGUN_API_KEY: "mailgun_key_test_1234567890",
	NEXT_PUBLIC_SEGMENT_WRITE_KEY: "sk_test_1234567890abcdef",
	NEXT_PUBLIC_SITE_URL: "https://example.com",
} satisfies Env;

beforeAll(() => {
	HTMLDialogElement.prototype.close = mockClose;
	HTMLDialogElement.prototype.show = mockShow;
	HTMLDialogElement.prototype.showModal = mockShowModal;

	globalThis.ResizeObserver = mockResizeObserver;
});

beforeEach(() => {
	mockClose.mockReset();
	mockRedirect.mockReset();
	mockShow.mockReset();
	mockShowModal.mockReset();
	mockToast.mockReset();
	mockUsePathname.mockReset().mockReturnValue(PagePath.ROOT);
	mockSetCookie.mockReset();
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
