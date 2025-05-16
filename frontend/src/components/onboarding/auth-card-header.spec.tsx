import { render, screen } from "@testing-library/react";
import { AuthCardHeader } from "@/components/onboarding/auth-card-header";

describe("AuthCardHeader", () => {
	it("renders the title and description correctly", () => {
		render(<AuthCardHeader description="Enter your credentials to access your account" title="Sign In" />);

		expect(screen.getByTestId("auth-card-title")).toHaveTextContent("Sign In");
		expect(screen.getByTestId("auth-card-description")).toHaveTextContent(
			"Enter your credentials to access your account",
		);
	});

	it("applies the correct styling to title and description", () => {
		render(<AuthCardHeader description="Enter your credentials" title="Sign In" />);

		const title = screen.getByTestId("auth-card-title");
		const description = screen.getByTestId("auth-card-description");

		expect(title).toHaveClass("text-4xl font-heading font-medium");
		expect(description).toHaveClass("text-app-gray-600");
	});

	it("allows custom test IDs for title and description", () => {
		render(
			<AuthCardHeader
				description="Create a new account"
				descriptionTestId="custom-desc-id"
				title="Register"
				titleTestId="custom-title-id"
			/>,
		);

		expect(screen.getByTestId("custom-title-id")).toHaveTextContent("Register");
		expect(screen.getByTestId("custom-desc-id")).toHaveTextContent("Create a new account");
	});
});
