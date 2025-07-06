import { render, screen } from "@testing-library/react";

import { WelcomeModalContent, WelcomeModalOverlay } from "./modal-overlay";

describe("WelcomeModalContent", () => {
	it("renders children correctly", () => {
		render(
			<WelcomeModalContent>
				<div data-testid="child-content">Hello modal</div>
			</WelcomeModalContent>,
		);

		expect(screen.getByTestId("child-content")).toHaveTextContent("Hello modal");
	});

	it("renders the close button when showCloseButton is true", () => {
		render(
			<WelcomeModalContent showCloseButton>
				<div>Modal with close</div>
			</WelcomeModalContent>,
		);

		expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
	});

	it("does not render close button by default", () => {
		render(
			<WelcomeModalContent>
				<div>No close button</div>
			</WelcomeModalContent>,
		);

		expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
	});
});

describe("WelcomeModalOverlay", () => {
	it("renders overlay with correct class", () => {
		render(<WelcomeModalOverlay data-testid="overlay" />);

		const overlay = screen.getByTestId("overlay");
		expect(overlay).toBeInTheDocument();
		expect(overlay).toHaveClass("bg-popup/40");
	});
});
