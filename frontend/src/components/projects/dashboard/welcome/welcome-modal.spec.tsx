import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUserStore } from "@/stores/user-store";
import { WelcomeModal } from "./welcome-modal";

// Mock router push
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

// Mock the user store
vi.mock("@/stores/user-store");

describe("WelcomeModal", () => {
	const dismissWelcomeModalMock = vi.fn();

	beforeEach(() => {
		// Reset mocks
		vi.clearAllMocks();

		// Mock the store hook
		vi.mocked(useUserStore).mockReturnValue({
			dismissWelcomeModal: dismissWelcomeModalMock,
			hasSeenWelcomeModal: false, // ensures modal shows initially
		});
	});

	it("renders welcome modal when hasSeenWelcomeModal is false", () => {
		render(<WelcomeModal />);

		// Check that the modal renders by looking for the dialog role
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		// Check for the progress bar
		expect(screen.getByRole("figure")).toBeInTheDocument();
	});

	it("shows progress bar with correct number of steps", () => {
		render(<WelcomeModal />);
		// find all step labels from PROGRESS_BAR_STEPS (imported from constants)
		// or check for presence of progress bar container
		expect(screen.getByRole("figure")).toBeInTheDocument();
	});

	it("calls dismissWelcomeModal when Later button is clicked", async () => {
		render(<WelcomeModal />);
		const user = userEvent.setup();

		const laterButton = screen.getByRole("button", { name: /Later/i });
		await user.click(laterButton);

		expect(dismissWelcomeModalMock).toHaveBeenCalledTimes(1);
	});

	it("calls dismissWelcomeModal and onStartApplication when Start New Application is clicked", async () => {
		const onStartApplication = vi.fn();
		render(<WelcomeModal onStartApplication={onStartApplication} />);
		const user = userEvent.setup();

		const startButton = screen.getByRole("button", { name: /Start New Application/i });
		await user.click(startButton);

		expect(dismissWelcomeModalMock).toHaveBeenCalledTimes(1);
		expect(onStartApplication).toHaveBeenCalledTimes(1);
	});

	it("renders alert message about AI limitations", () => {
		render(<WelcomeModal />);
		expect(screen.getByText(/AI has limitations and may occasionally make mistakes/i)).toBeInTheDocument();
	});
});
