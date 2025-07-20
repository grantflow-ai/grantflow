import { ApplicationFactory } from "::testing/factories";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateApplicationButton } from "./create-application-button";

// Mock the dependencies
vi.mock("next/navigation");
vi.mock("sonner");
vi.mock("@/actions/grant-applications");
vi.mock("@/utils/logger");

const mockPush = vi.fn();
const mockRouter = {
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
	push: mockPush,
	refresh: vi.fn(),
	replace: vi.fn(),
};
const mockUseRouter = vi.mocked(await import("next/navigation").then((m) => m.useRouter));
const mockToast = vi.mocked(toast);
const mockCreateApplication = vi.mocked(await import("@/actions/grant-applications").then((m) => m.createApplication));

describe("CreateApplicationButton", () => {
	const defaultProps = {
		organizationId: "org-123",
		projectId: "project-456",
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockUseRouter.mockReturnValue(mockRouter);
	});

	it("should render create application button", () => {
		render(<CreateApplicationButton {...defaultProps} />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("New Application");
		expect(button).not.toBeDisabled();
	});

	it("should create application and navigate to wizard on click", async () => {
		const user = userEvent.setup();
		const application = ApplicationFactory.build({ id: "app-789" });
		mockCreateApplication.mockResolvedValue(application);

		render(<CreateApplicationButton {...defaultProps} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(mockCreateApplication).toHaveBeenCalledWith(defaultProps.organizationId, defaultProps.projectId, {
			title: "Untitled Application",
		});
		expect(mockPush).toHaveBeenCalledWith("/project/project-456/application/app-789/wizard");
	});

	it("should show loading state during creation", async () => {
		const user = userEvent.setup();
		mockCreateApplication.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

		render(<CreateApplicationButton {...defaultProps} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(button).toHaveTextContent("Creating...");
		expect(button).toBeDisabled();
	});

	it("should handle creation errors", async () => {
		const user = userEvent.setup();
		const error = new Error("Creation failed");
		mockCreateApplication.mockRejectedValue(error);

		render(<CreateApplicationButton {...defaultProps} />);

		const button = screen.getByTestId("create-application-button");
		await user.click(button);

		expect(mockToast.error).toHaveBeenCalledWith("Failed to create application");
		expect(button).toHaveTextContent("New Application");
		expect(button).not.toBeDisabled();
	});

	it("should apply custom className", () => {
		const customClass = "custom-button-class";
		render(<CreateApplicationButton {...defaultProps} className={customClass} />);

		const button = screen.getByTestId("create-application-button");
		expect(button).toHaveClass(customClass);
	});
});
