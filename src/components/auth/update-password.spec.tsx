import { updatePassword } from "@/actions/auth";
import { PagePath } from "@/config/enums";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import mockRouter from "next-router-mock";
import { UpdatePasswordForm } from "./update-password-form";

vi.mock("@/actions/auth", () => ({
	updatePassword: vi.fn(),
}));

describe("UpdatePassword", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the form correctly", () => {
		render(<UpdatePasswordForm />);

		expect(screen.getByTestId("update-password-form")).toBeInTheDocument();
		expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
	});

	it("disables submit button initially", () => {
		render(<UpdatePasswordForm />);

		expect(screen.getByTestId("update-password-form-submit-button")).toBeDisabled();
	});

	it("shows error for short password", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "short");

		await waitFor(() => {
			expect(screen.getByTestId("password-input-error-message")).toHaveTextContent(
				"Password must be at least 8 characters",
			);
		});
	});

	it("shows error for non-matching passwords", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "password123");
		await userEvent.type(screen.getByTestId("update-password-form-password-confirm-input"), "password456");

		await waitFor(() => {
			expect(screen.getByTestId("password-confirm-input-error-message")).toHaveTextContent("Passwords don't match");
		});
	});

	it("enables submit button when form is valid", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "password123");
		await userEvent.type(screen.getByTestId("update-password-form-password-confirm-input"), "password123");

		await waitFor(() => {
			expect(screen.getByTestId("update-password-form-submit-button")).toBeEnabled();
		});
	});

	it("calls updatePassword and redirects on successful submission", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "password123");
		await userEvent.type(screen.getByTestId("update-password-form-password-confirm-input"), "password123");

		vi.mocked(updatePassword).mockResolvedValueOnce(undefined);

		await userEvent.click(screen.getByTestId("update-password-form-submit-button"));

		await waitFor(() => {
			expect(updatePassword).toHaveBeenCalledWith("password123", "password123");
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("handles submission error", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "password123");
		await userEvent.type(screen.getByTestId("update-password-form-password-confirm-input"), "password123");

		const error = new Error("Update failed");
		vi.mocked(updatePassword).mockRejectedValueOnce(error);

		await userEvent.click(screen.getByTestId("update-password-form-submit-button"));

		await waitFor(() => {
			expect(updatePassword).toHaveBeenCalledWith("password123", "password123");
			expect(mockRouter.pathname).toEqual(PagePath.ROOT);
		});
	});

	it("shows loading state during form submission", async () => {
		render(<UpdatePasswordForm />);

		await userEvent.type(screen.getByTestId("update-password-form-password-input"), "password123");
		await userEvent.type(screen.getByTestId("update-password-form-password-confirm-input"), "password123");

		vi.mocked(updatePassword).mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 100)));

		await userEvent.click(screen.getByTestId("update-password-form-submit-button"));

		expect(screen.getByTestId("update-password-form-submit-button")).toHaveAttribute("aria-busy", "true");

		await waitFor(() => {
			expect(screen.getByTestId("update-password-form-submit-button")).toHaveAttribute("aria-busy", "false");
		});
	});
});
