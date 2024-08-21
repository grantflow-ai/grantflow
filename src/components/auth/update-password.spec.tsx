import { mockToast } from "::testing/global-mocks";
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
		expect(screen.getByTestId("update-password-form-password-input")).toBeInTheDocument();
		expect(screen.getByTestId("update-password-form-password-confirm-input-label")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
	});

	it("disables submit button initially", () => {
		render(<UpdatePasswordForm />);

		expect(screen.getByTestId("update-password-form-submit-button")).toBeDisabled();
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

		const errorMessage = "Update failed";
		vi.mocked(updatePassword).mockResolvedValueOnce(errorMessage);

		await userEvent.click(screen.getByTestId("update-password-form-submit-button"));

		await waitFor(() => {
			expect((mockToast as any).error).toHaveBeenCalledWith(errorMessage, { duration: 3000 });
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
