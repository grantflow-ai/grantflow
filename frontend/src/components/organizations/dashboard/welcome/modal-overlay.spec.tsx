import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";

import { WelcomeModalContent, WelcomeModalOverlay } from "./modal-overlay";

function DialogWrapper({ children }: { children: React.ReactNode }) {
	return <DialogPrimitive.Root open>{children}</DialogPrimitive.Root>;
}

describe.sequential("WelcomeModalContent", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders children correctly", () => {
		render(
			<DialogWrapper>
				<WelcomeModalContent>
					<div data-testid="child-content">Hello modal</div>
				</WelcomeModalContent>
			</DialogWrapper>,
		);

		expect(screen.getByTestId("child-content")).toHaveTextContent("Hello modal");
	});

	it("renders the close button when showCloseButton is true", () => {
		render(
			<DialogWrapper>
				<WelcomeModalContent showCloseButton>
					<div>Modal with close</div>
				</WelcomeModalContent>
			</DialogWrapper>,
		);

		expect(screen.getByRole("button", { name: /close/i })).toBeInTheDocument();
	});

	it("does not render close button by default", () => {
		render(
			<DialogWrapper>
				<WelcomeModalContent>
					<div>No close button</div>
				</WelcomeModalContent>
			</DialogWrapper>,
		);

		expect(screen.queryByRole("button", { name: /close/i })).not.toBeInTheDocument();
	});
});

describe.sequential("WelcomeModalOverlay", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders overlay with correct class", () => {
		render(
			<DialogWrapper>
				<WelcomeModalOverlay data-testid="overlay" />
			</DialogWrapper>,
		);

		const overlay = screen.getByTestId("overlay");
		expect(overlay).toBeInTheDocument();
		expect(overlay).toHaveClass("bg-popup/40");
	});
});
