import { ProjectListItemFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DashboardPage from "./page";

vi.mock("@/utils/env", () => ({
	getEnv: () => ({
		NEXT_PUBLIC_BACKEND_API_BASE_URL: "http://localhost:8080",
		NEXT_PUBLIC_FIREBASE_API_KEY: "mock-api-key",
		NEXT_PUBLIC_FIREBASE_APP_ID: "mock-app-id",
		NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "mock.firebaseapp.com",
		NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "mock-measurement-id",
		NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "mock-sender-id",
		NEXT_PUBLIC_FIREBASE_MICROSOFT_TENANT_ID: "mock-tenant-id",
		NEXT_PUBLIC_FIREBASE_PROJECT_ID: "mock-project-id",
		NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "mock.appspot.com",
		NEXT_PUBLIC_MAILGUN_API_KEY: "mock-mailgun-key",
		NEXT_PUBLIC_MOCK_API: true,
		NEXT_PUBLIC_SEGMENT_WRITE_KEY: "mock-segment-key",
		NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
	}),
}));

vi.mock("next/navigation", () => ({
	usePathname: () => "/projects",
	useRouter: () => ({ push: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: () => ({
		hasSeenWelcomeModal: true,
		isAuthenticated: true,
		user: { email: "test@example.com", uid: "test-uid" },
	}),
}));

vi.mock("@/stores/notification-store", () => ({
	useNotificationStore: () => ({
		addNotification: vi.fn(),
		notifications: [],
	}),
}));

vi.mock("@/stores/project-store", () => ({
	useProjectStore: () => ({
		deleteProject: vi.fn(),
		duplicateProject: vi.fn(),
		projects: [],
	}),
}));

const mockGetProjects = vi.fn();
vi.mock("@/actions/project", () => ({
	getProjects: () => mockGetProjects(),
}));

describe("Dashboard Page", () => {
	beforeEach(() => {
		mockGetProjects.mockClear();
		vi.clearAllMocks();
	});

	it("should render DashboardClient with fetched projects", async () => {
		const mockProjects = ProjectListItemFactory.batch(2);
		mockGetProjects.mockResolvedValue(mockProjects);

		const Page = await DashboardPage();
		render(Page);

		// Test that the page renders the DashboardClient component
		expect(screen.getByTestId("dashboard-stats")).toBeInTheDocument();
	});
});
