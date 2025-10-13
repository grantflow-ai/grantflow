import { render, waitFor } from "@testing-library/react";
import { onAuthStateChanged } from "firebase/auth";
import { useUserStore } from "@/stores/user-store";
import { convertFirebaseUser, getFirebaseAuth } from "@/utils/firebase";

import { AuthProvider } from "./auth-provider";

vi.mock("firebase/auth");
vi.mock("@/utils/firebase");
vi.mock("@/stores/user-store");
vi.mock("@/utils/logger/client", () => ({
	log: {
		error: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

describe("AuthProvider", () => {
	const mockSetUser = vi.fn();
	const mockGetFirebaseAuth = vi.mocked(getFirebaseAuth);
	const mockOnAuthStateChanged = vi.mocked(onAuthStateChanged);
	const mockConvertFirebaseUser = vi.mocked(convertFirebaseUser);
	const mockUseUserStore = vi.mocked(useUserStore);

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseUserStore.mockReturnValue({
			clearUser: vi.fn(),
			deleteProfilePhoto: vi.fn(),
			dismissWelcomeModal: vi.fn(),
			hasSeenWelcomeModal: false,
			isAuthenticated: false,
			isBackofficeAdmin: false,
			setBackofficeAdmin: vi.fn(),
			setUser: mockSetUser,
			updateDisplayName: vi.fn(),
			updateEmail: vi.fn(),
			updateProfilePhoto: vi.fn(),
			user: null,
		});

		mockGetFirebaseAuth.mockReturnValue({} as any);
	});

	it("should render children when auth state is loaded", async () => {
		let authCallback: any;
		mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
			authCallback = callback;
			return vi.fn();
		});

		const { container } = render(
			<AuthProvider>
				<div data-testid="child">Test Child</div>
			</AuthProvider>,
		);

		// Initially nothing should render (loading state)
		expect(container.querySelector('[data-testid="child"]')).toBeNull();

		// Trigger auth callback with null user
		authCallback(null);

		await waitFor(() => {
			expect(container.querySelector('[data-testid="child"]')).toBeInTheDocument();
		});
	});

	it("should set user when user logs in", async () => {
		const mockUser = {
			email: "test@example.com",
			uid: "test-uid",
		};
		const mockConvertedUser = {
			displayName: null,
			email: "test@example.com",
			emailVerified: false,
			phoneNumber: null,
			photoURL: null,
			uid: "test-uid",
		};

		mockConvertFirebaseUser.mockReturnValue(mockConvertedUser as any);

		let authCallback: any;
		mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
			authCallback = callback;
			return vi.fn();
		});

		render(
			<AuthProvider>
				<div>Test</div>
			</AuthProvider>,
		);

		authCallback(mockUser);

		await waitFor(() => {
			expect(mockSetUser).toHaveBeenCalledWith(mockConvertedUser);
		});
	});

	it("should clear user when user logs out", async () => {
		let authCallback: any;
		mockOnAuthStateChanged.mockImplementation((_auth, callback) => {
			authCallback = callback;
			return vi.fn();
		});

		render(
			<AuthProvider>
				<div>Test</div>
			</AuthProvider>,
		);

		authCallback(null);

		await waitFor(() => {
			expect(mockSetUser).toHaveBeenCalledWith(null);
		});
	});

	it("should unsubscribe from auth state on unmount", () => {
		const mockUnsubscribe = vi.fn();
		mockOnAuthStateChanged.mockReturnValue(mockUnsubscribe);

		const { unmount } = render(
			<AuthProvider>
				<div>Test</div>
			</AuthProvider>,
		);

		unmount();

		expect(mockUnsubscribe).toHaveBeenCalled();
	});
});
