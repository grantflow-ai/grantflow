import process from "node:process";
import type { toast } from "sonner";
import { beforeAll, beforeEach, type Mock, vi } from "vitest";
import type { Env } from "@/types/env-types";

const {
	mockCookies,
	mockGetCookie,
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
	const mockGetCookie = vi.fn().mockReturnValue({
		name: "grantflow_session",
		value: "mock-session-token",
	});
	const mockCookies = vi.fn().mockImplementation(() =>
		Promise.resolve({
			delete: vi.fn(),
			get: mockGetCookie,
			getAll: vi.fn().mockReturnValue([]),
			has: vi.fn().mockReturnValue(false),
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
		mockGetCookie,
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

vi.mock("@/utils/env", () => ({
	getEnv: vi.fn().mockReturnValue(mockEnv),
}));

vi.mock("@grantflow/editor", () => ({
	Editor: vi.fn().mockImplementation(({ ref }) => {
		if (ref) {
			ref.current = {
				getHeadings: vi.fn().mockReturnValue([]),
				scrollToHeading: vi.fn(),
			};
		}
		return null;
	}),
}));

vi.mock("@segment/analytics-next", () => ({
	AnalyticsBrowser: {
		load: vi.fn().mockReturnValue({
			alias: vi.fn().mockResolvedValue(undefined),
			group: vi.fn().mockResolvedValue(undefined),
			identify: vi.fn().mockResolvedValue(undefined),
			page: vi.fn().mockResolvedValue(undefined),
			reset: vi.fn().mockResolvedValue(undefined),
			track: vi.fn().mockResolvedValue(undefined),
		}),
	},
}));

const mockAnalyticsInstance = {
	_loadOptions: {},
	_writeKey: "M5CP7BfkccD2I8k11pFE5qAcFjibdUyn",
	addDestinationMiddleware: vi.fn().mockResolvedValue(undefined),
	addIntegrationMiddleware: vi.fn().mockResolvedValue(undefined),
	addSourceMiddleware: vi.fn().mockResolvedValue(undefined),
	alias: vi.fn().mockResolvedValue(undefined),
	debug: vi.fn().mockResolvedValue(undefined),
	factory: vi.fn(),
	group: vi.fn().mockResolvedValue(undefined),
	identify: vi.fn().mockResolvedValue(undefined),

	initialized: true,
	invoked: true,
	load: vi.fn(),
	methods: [
		"trackSubmit",
		"trackClick",
		"trackLink",
		"trackForm",
		"pageview",
		"identify",
		"reset",
		"group",
		"track",
		"ready",
		"alias",
		"debug",
		"page",
		"screen",
		"once",
		"off",
		"on",
		"addSourceMiddleware",
		"addIntegrationMiddleware",
		"setAnonymousId",
		"addDestinationMiddleware",
		"register",
	],
	off: vi.fn().mockResolvedValue(undefined),
	on: vi.fn().mockResolvedValue(undefined),
	once: vi.fn().mockResolvedValue(undefined),
	page: vi.fn().mockResolvedValue(undefined),
	pageview: vi.fn().mockResolvedValue(undefined),
	push: vi.fn(),
	ready: vi.fn().mockResolvedValue(undefined),
	register: vi.fn().mockResolvedValue(undefined),
	reset: vi.fn().mockResolvedValue(undefined),
	screen: vi.fn().mockResolvedValue(undefined),
	setAnonymousId: vi.fn().mockResolvedValue(undefined),
	SNIPPET_VERSION: "5.2.0",
	track: vi.fn().mockResolvedValue(undefined),
	trackClick: vi.fn().mockResolvedValue(undefined),
	trackForm: vi.fn().mockResolvedValue(undefined),
	trackLink: vi.fn().mockResolvedValue(undefined),

	trackSubmit: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/utils/segment", () => ({
	analytics: { value: mockAnalyticsInstance },
	analyticsIdentify: vi.fn().mockResolvedValue(undefined),
	getAnalytics: vi.fn().mockReturnValue(mockAnalyticsInstance),
}));

export {
	mockCookies,
	mockGetCookie,
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
	NEXT_PUBLIC_CRDT_SERVER_URL: "ws://127.0.0.1:8090",
	NEXT_PUBLIC_DEBUG: true,
	NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
	NEXT_PUBLIC_FIREBASE_APP_ID: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
	NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "acmetech-dev.firebaseapp.com",
	NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XYZ123ABC4",
	NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "847362514908",
	NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: "72a88c64-9b3d-4e5f-8c7a-1b2d3e4f5a6b",
	NEXT_PUBLIC_FIREBASE_PROJECT_ID: "acmetech-dev",
	NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "acmetech-dev.appspot.com",
	NEXT_PUBLIC_GCS_EMULATOR_URL: "http://localhost:4443",
	NEXT_PUBLIC_SITE_URL: "https://example.com",
	RESEND_API_KEY: "re_test_1234567890abcdef",
} satisfies Env;

beforeAll(() => {
	HTMLDialogElement.prototype.close = mockClose;
	HTMLDialogElement.prototype.show = mockShow;
	HTMLDialogElement.prototype.showModal = mockShowModal;

	globalThis.ResizeObserver = mockResizeObserver;

	globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
		disconnect: vi.fn(),
		observe: vi.fn(),
		root: null,
		rootMargin: "",
		thresholds: [],
		unobserve: vi.fn(),
	})) as any;

	(globalThis as any).analytics = Object.assign([], mockAnalyticsInstance);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!globalThis.navigator) {
		globalThis.navigator = {} as Navigator;
	}
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!globalThis.navigator.clipboard) {
		Object.defineProperty(globalThis.navigator, "clipboard", {
			configurable: true,
			value: {
				readText: vi.fn().mockResolvedValue(""),
				writeText: vi.fn().mockResolvedValue(undefined),
			} as unknown as Clipboard,
			writable: true,
		});
	}

	const originalFileListDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "files");
	Object.defineProperty(HTMLInputElement.prototype, "files", {
		configurable: true,
		get() {
			const files = originalFileListDescriptor?.get?.call(this) ?? this._files ?? [];
			if (files && !files.item && Array.isArray(files)) {
				(files as any).item = (index: number) => files[index] ?? null;
			}
			return files;
		},
		set(value) {
			if (originalFileListDescriptor?.set) {
				originalFileListDescriptor.set.call(this, value);
			}
			this._files = value;
			if (value && !value.item) {
				value.item = (index: number) => value[index] ?? null;
			}
		},
	});
});

beforeEach(() => {
	mockClose.mockReset();
	mockRedirect.mockReset();
	mockShow.mockReset();
	mockShowModal.mockReset();
	mockToast.mockReset();
	mockUsePathname.mockReset().mockReturnValue("/");
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

	vi.clearAllMocks();
});
