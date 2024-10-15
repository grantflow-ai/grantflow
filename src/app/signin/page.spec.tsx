import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AuthPage from "./page";

vi.mock("@/utils/supabase/server", () => ({
	getServerClient: () => ({
		auth: {
			getUser: () => ({
				data: { user: null },
			}),
		},
	}),
}));

describe("AuthPage", () => {
	it("renders the page with title, description, and forms", async () => {
		render(await AuthPage());

		const authPage = await screen.findByTestId("auth-page");
		const title = screen.getByTestId("auth-page-title");
		const description = screen.getByTestId("auth-page-description");
		const separator = screen.getByTestId("separator");

		expect(authPage).toBeInTheDocument();
		expect(title).toBeInTheDocument();
		expect(description).toBeInTheDocument();
		expect(separator).toBeInTheDocument();
	});
});
