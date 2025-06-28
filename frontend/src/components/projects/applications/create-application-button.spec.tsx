import { ApplicationFactory } from "::testing/factories";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createApplication } from "@/actions/grant-applications";
import { CreateApplicationButton } from "./create-application-button";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
	},
}));

vi.mock("@/actions/grant-applications", () => ({
	createApplication: vi.fn(),
}));

vi.mock("@/utils/logging", () => ({
	logError: vi.fn(),
}));

describe("CreateApplicationButton", () => {
	const mockPush = vi.fn();
	const mockProjectId = ApplicationFactory.build().id;

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(useRouter).mockReturnValue({
			push: mockPush,
		} as any);
	});

	it("renders create button with correct text", () => {
		render(<CreateApplicationButton projectId={mockProjectId} />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("New Application");
		expect(button).not.toBeDisabled();
	});

	it("creates application and navigates on successful creation", async () => {
		const mockApplication = ApplicationFactory.build();
		vi.mocked(createApplication).mockResolvedValue(mockApplication);
		const user = userEvent.setup();

		render(<CreateApplicationButton projectId={mockProjectId} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(createApplication).toHaveBeenCalledWith(mockProjectId, {
			title: "Untitled Application",
		});

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith(
				`/projects/${mockProjectId}/applications/${mockApplication.id}/wizard`,
			);
		});
	});

	it("shows loading state during creation", async () => {
		let resolvePromise: (value: any) => void;
		const createPromise = new Promise<any>((resolve) => {
			resolvePromise = resolve;
		});
		vi.mocked(createApplication).mockReturnValue(createPromise);
		const user = userEvent.setup();

		render(<CreateApplicationButton projectId={mockProjectId} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(screen.getByTestId("create-application-button")).toHaveTextContent("Creating...");
		expect(screen.getByTestId("create-application-button")).toBeDisabled();

		const mockApplication = ApplicationFactory.build();
		resolvePromise!(mockApplication);

		await waitFor(() => {
			expect(mockPush).toHaveBeenCalledWith(
				`/projects/${mockProjectId}/applications/${mockApplication.id}/wizard`,
			);
		});
	});

	it("handles creation error gracefully", async () => {
		const error = new Error("Creation failed");
		vi.mocked(createApplication).mockRejectedValue(error);
		const user = userEvent.setup();

		render(<CreateApplicationButton projectId={mockProjectId} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("Failed to create application");
		});

		expect(screen.getByTestId("create-application-button")).toHaveTextContent("New Application");
		expect(screen.getByTestId("create-application-button")).not.toBeDisabled();
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("applies custom className when provided", () => {
		const customClass = "custom-button-class";
		render(<CreateApplicationButton className={customClass} projectId={mockProjectId} />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toHaveClass(customClass);
	});
});