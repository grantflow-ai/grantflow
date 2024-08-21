import { ApiPath } from "@/config/enums";
import { getBrowserClient } from "@/utils/supabase/client";
import { urlWithHost } from "@/utils/url";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OauthSigninForm } from "./oauth-signin-form";

vi.mock("@/utils/supabase/client");
vi.mock("@/utils/url");

describe("OauthSignin", () => {
	const mockSignInWithOAuth = vi.fn();

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(getBrowserClient).mockReturnValue({
			auth: {
				signInWithOAuth: mockSignInWithOAuth,
			},
		} as any);
		vi.mocked(urlWithHost).mockReturnValueOnce("http://localhost:3000/api/auth/callback");
	});

	it("renders the OAuth signin form", () => {
		render(<OauthSigninForm />);
		expect(screen.getByTestId("oauth-signin-form")).toBeInTheDocument();
	});

	it.each([
		["google", "Google"],
		["github", "GitHub"],
	])("renders %s button with correct text", (provider, displayName) => {
		render(<OauthSigninForm />);
		const button = screen.getByTestId(`oauth-signin-form-${provider}-button`);
		expect(button).toBeInTheDocument();
		expect(screen.getByTestId(`oauth-signin-form-${provider}-text`)).toHaveTextContent(displayName);
	});

	it.each(["google", "github"])("renders %s icon", (provider) => {
		render(<OauthSigninForm />);
		expect(screen.getByTestId(`oauth-signin-form-${provider}-icon`)).toBeInTheDocument();
	});

	it.each([["google"], ["github"]])("calls handleSubmit with '%s' when %s button is clicked", async (provider) => {
		render(<OauthSigninForm />);
		const button = screen.getByTestId(`oauth-signin-form-${provider}-button`);
		await userEvent.click(button);

		expect(mockSignInWithOAuth).toHaveBeenCalledWith({
			provider,
			options: {
				redirectTo: "http://localhost:3000/api/auth/callback",
			},
		});
	});

	it("uses the correct redirect URL from ApiPath.CALLBACK_OPENID", async () => {
		render(<OauthSigninForm />);
		const googleButton = screen.getByTestId("oauth-signin-form-google-button");
		await userEvent.click(googleButton);

		expect(urlWithHost).toHaveBeenCalledWith(ApiPath.CALLBACK_OPENID);
	});

	it("handles errors gracefully when signInWithOAuth fails", async () => {
		mockSignInWithOAuth.mockRejectedValueOnce(new Error("Auth failed"));

		render(<OauthSigninForm />);
		const googleButton = screen.getByTestId("oauth-signin-form-google-button");
		await userEvent.click(googleButton);

		const errorMessage = screen.getByTestId("oauth-signin-error");
		expect(errorMessage).toBeInTheDocument();
	});
});
