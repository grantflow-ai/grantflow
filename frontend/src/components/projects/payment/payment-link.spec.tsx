import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach } from "vitest";
import PaymentLink from "./payment-link";

afterEach(() => {
	cleanup();
});

describe("PaymentLink", () => {
	it("opens the payment modal when the upgrade button is clicked", async () => {
		const user = userEvent.setup();
		const { container } = render(<PaymentLink />);
		expect(container.querySelector('[data-testid="payment-modal"]')).not.toBeInTheDocument();
		const upgradeButton = container.querySelector('[data-testid="upgrade-button"]');
		await user.click(upgradeButton!);
		expect(await screen.findByTestId("payment-modal")).toBeInTheDocument();
	});
});
