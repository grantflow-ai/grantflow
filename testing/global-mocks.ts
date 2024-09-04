import process from "node:process";

import { PagePath } from "@/config/enums";
import type { Env } from "@/types/env-types";
import { faker } from "@faker-js/faker";
import { beforeEach, vi } from "vitest";

const { mockUsePathname, mockRedirect, mockToast } = vi.hoisted(() => {
	const mockToast = vi.fn();
	Reflect.set(mockToast, "error", vi.fn());
	Reflect.set(mockToast, "success", vi.fn());
	Reflect.set(mockToast, "info", vi.fn());
	Reflect.set(mockToast, "promise", vi.fn());

	return {
		mockUsePathname: vi.fn(),
		mockRedirect: vi.fn(),
		mockToast,
	};
});

vi.mock("next/navigation", async (importOriginal) => {
	const original = await importOriginal();
	const { useRouter } = await vi.importActual("next-router-mock");

	return {
		...(original as Record<string, unknown>),
		useRouter,
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

// see: https://stackoverflow.com/questions/78561620/need-help-unit-testing-select-from-shadcn-ui
export class MockPointerEvent extends Event {
	button: number | undefined;
	ctrlKey: boolean | undefined;

	constructor(type: string, props: EventInit & { button?: number | null; ctrlKey?: boolean | null }) {
		super(type, props);
		if (props.button !== null) {
			this.button = props.button;
		}
		if (props.ctrlKey !== null) {
			this.ctrlKey = props.ctrlKey;
		}
	}
}
export const mockScrollIntoView = vi.fn();
export const mockHasPointerCapture = vi.fn();
export const mockReleasePointerCapture = vi.fn();
export const mockCreateObjectURL = vi.fn().mockImplementation(() => faker.image.url());
export const mockRevokeObjectURL = vi.fn();

// see: https://github.com/jsdom/jsdom/issues/3294
export const mockShowModal = vi.fn();
export const mockShow = vi.fn();
export const mockClose = vi.fn();

// mock the fetch function
export const mockFetch = vi.fn();

// mock the env we expect
export const mockEnv = {
	NEXT_PUBLIC_DEBUG: true,
	NEXT_PUBLIC_SITE_URL: "https://example.com",
	NEXT_PUBLIC_SUPABASE_ANON_KEY: "valid_key",
	NEXT_PUBLIC_SUPABASE_URL: "https://supabase.co",
} satisfies Env;

beforeAll(() => {
	HTMLDialogElement.prototype.close = mockClose;
	HTMLDialogElement.prototype.show = mockShow;
	HTMLDialogElement.prototype.showModal = mockShowModal;
	window.HTMLElement.prototype.hasPointerCapture = mockHasPointerCapture;
	window.HTMLElement.prototype.releasePointerCapture = mockReleasePointerCapture;
	window.HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
	window.PointerEvent = MockPointerEvent as any;
	window.URL.createObjectURL = mockCreateObjectURL;
	window.URL.revokeObjectURL = mockRevokeObjectURL;
});

beforeEach(() => {
	mockClose.mockReset();
	mockHasPointerCapture.mockReset();
	mockRedirect.mockReset();
	mockReleasePointerCapture.mockReset();
	mockScrollIntoView.mockReset();
	mockShow.mockReset();
	mockShowModal.mockReset();
	mockToast.mockReset();
	mockUsePathname.mockReset().mockReturnValue(PagePath.ROOT);
	mockFetch.mockReset().mockResolvedValue({
		json: () => Promise.resolve({}),
		ok: true,
		status: 200,
	});
	global.fetch = mockFetch;
	Object.assign(
		process.env,
		Object.fromEntries(Object.entries(mockEnv).map(([key, value]) => [key, value.toString()])),
	);
});
