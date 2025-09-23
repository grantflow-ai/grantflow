import { cleanup, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import OnboardingPage from "./page";

const mockUseCookieConsent = vi.hoisted(() => vi.fn());
const mockUseUserStore = vi.hoisted(() => vi.fn());
const mockUseRouter = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/use-cookie-consent", () => ({
	useCookieConsent: mockUseCookieConsent,
}));

vi.mock("@/stores/user-store", () => ({
	useUserStore: mockUseUserStore,
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

vi.mock("@/utils/firebase", () => ({
	updateUserProfile: vi.fn().mockResolvedValue(undefined),
}));

describe("OnboardingPage", () => {
	const mockRouterReplace = vi.fn();

	beforeEach(() => {
		mockUseRouter.mockReturnValue({
			replace: mockRouterReplace,
		});

		mockUseCookieConsent.mockReturnValue({
			hasConsent: true,
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("redirects to login when no user is present", () => {
		mockUseUserStore.mockReturnValue({
			setUser: vi.fn(),
			user: null,
		});

		render(<OnboardingPage />);

		expect(mockRouterReplace).toHaveBeenCalledWith("/login");
	});

	it("redirects to organization when profile is already complete", () => {
		mockUseUserStore.mockReturnValue({
			setUser: vi.fn(),
			user: {
				displayName: "Test User",
				email: "test@example.com",
				uid: "test-uid",
			},
		});

		render(<OnboardingPage />);

		expect(mockRouterReplace).toHaveBeenCalledWith("/organization");
	});

	it("renders onboarding form when profile is incomplete", () => {
		mockUseUserStore.mockReturnValue({
			setUser: vi.fn(),
			user: {
				displayName: null,
				email: "test@example.com",
				uid: "test-uid",
			},
		});

		render(<OnboardingPage />);

		expect(screen.getByTestId("onboarding-container")).toBeInTheDocument();
		expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
		expect(screen.getByTestId("onboarding-display-name-input")).toBeInTheDocument();
		expect(screen.getByTestId("onboarding-submit-button")).toBeInTheDocument();
	});

	it("renders onboarding form when displayName is too short", () => {
		mockUseUserStore.mockReturnValue({
			setUser: vi.fn(),
			user: {
				displayName: "X", // Too short
				email: "test@example.com",
				uid: "test-uid",
			},
		});

		render(<OnboardingPage />);

		expect(screen.getByTestId("onboarding-container")).toBeInTheDocument();
		expect(screen.getByText("Complete Your Profile")).toBeInTheDocument();
	});
});
