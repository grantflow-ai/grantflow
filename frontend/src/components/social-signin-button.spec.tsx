import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SocialSigninButton } from "./social-signin-buttons";

describe("SocialSigninButton", () => {
	it("renders Google button correctly", () => {
		render(<SocialSigninButton isLoading={false} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("Google");
	});

	it("renders ORCID button correctly", () => {
		render(<SocialSigninButton isLoading={false} onClick={async () => {}} platform="orcid" />);

		const button = screen.getByRole("button", { name: /orcid/i });
		expect(button).toBeInTheDocument();
		expect(button).toHaveTextContent("ORCID");
	});

	it("disables button when isLoading is true", () => {
		render(<SocialSigninButton isLoading={true} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).toBeDisabled();
	});

	it("calls onClick handler when button is clicked", async () => {
		const mockOnClick = vi.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();

		render(<SocialSigninButton isLoading={false} onClick={mockOnClick} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		await user.click(button);

		expect(mockOnClick).toHaveBeenCalledTimes(1);
	});

	it("renders the correct icon based on platform", () => {
		const { rerender } = render(
			<SocialSigninButton isLoading={false} onClick={async () => {}} platform="google" />,
		);

		expect(screen.getByTestId("icon-social-google")).toBeInTheDocument();
		expect(screen.queryByTestId("icon-social-orcid")).not.toBeInTheDocument();

		rerender(<SocialSigninButton isLoading={false} onClick={async () => {}} platform="orcid" />);

		expect(screen.getByTestId("icon-social-orcid")).toBeInTheDocument();
		expect(screen.queryByTestId("icon-social-google")).not.toBeInTheDocument();
	});
});
