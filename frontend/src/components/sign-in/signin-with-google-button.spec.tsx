import { fireEvent, render, screen } from "@testing-library/react";
import { SigninWithGoogleButton } from "./signin-with-google-button";

describe("SigninWithGoogleButton", () => {
	const mockOnClick = vi.fn().mockResolvedValue(undefined);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the button correctly", () => {
		render(<SigninWithGoogleButton isLoading={false} onClick={mockOnClick} />);

		expect(screen.getByTestId("oauth-signin-form")).toBeInTheDocument();
		expect(screen.getByTestId("oauth-signin-form-google-button")).toBeInTheDocument();
		expect(screen.getByTestId("oauth-signin-form-google-text")).toHaveTextContent("Sign in with Google");
		expect(screen.getByTestId("oauth-signin-form-google-icon")).toBeInTheDocument();
	});

	it("calls onClick when clicked", async () => {
		render(<SigninWithGoogleButton isLoading={false} onClick={mockOnClick} />);

		const button = screen.getByTestId("oauth-signin-form-google-button");
		fireEvent.click(button);

		expect(mockOnClick).toHaveBeenCalledTimes(1);
	});

	it("disables the button when isLoading is true", () => {
		render(<SigninWithGoogleButton isLoading={true} onClick={mockOnClick} />);

		const button = screen.getByTestId("oauth-signin-form-google-button");
		expect(button).toBeDisabled();

		fireEvent.click(button);
		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it("has the correct styling", () => {
		render(<SigninWithGoogleButton isLoading={false} onClick={mockOnClick} />);

		const button = screen.getByTestId("oauth-signin-form-google-button");
		expect(button).toHaveClass("w-full");
		expect(button).toHaveClass("border");
		expect(button).toHaveClass("rounded");
	});
});
