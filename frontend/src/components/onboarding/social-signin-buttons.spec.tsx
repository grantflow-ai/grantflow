import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe } from "vitest";

import { SocialSigninButton } from "./social-signin-buttons";

describe.sequential("SocialSigninButton", () => {
	afterEach(() => {
		cleanup();
	});
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

	it("disables button when isDisabled is true", () => {
		render(<SocialSigninButton isDisabled={true} isLoading={false} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).toBeDisabled();
	});

	it("enables button when both isLoading and isDisabled are false", () => {
		render(<SocialSigninButton isDisabled={false} isLoading={false} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).not.toBeDisabled();
	});

	it("disables button when both isLoading and isDisabled are true", () => {
		render(<SocialSigninButton isDisabled={true} isLoading={true} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).toBeDisabled();
	});

	it("disables button when isDisabled is true even if isLoading is false", () => {
		render(<SocialSigninButton isDisabled={true} isLoading={false} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).toBeDisabled();
	});

	it("does not call onClick handler when button is disabled", async () => {
		const mockOnClick = vi.fn().mockResolvedValue(undefined);
		const user = userEvent.setup();

		render(<SocialSigninButton isDisabled={true} isLoading={false} onClick={mockOnClick} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		await user.click(button);

		expect(mockOnClick).not.toHaveBeenCalled();
	});

	it("enables button by default when isDisabled is not provided", () => {
		render(<SocialSigninButton isLoading={false} onClick={async () => {}} platform="google" />);

		const button = screen.getByRole("button", { name: /google/i });
		expect(button).not.toBeDisabled();
	});
});
