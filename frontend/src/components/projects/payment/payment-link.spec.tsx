import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentLink from "./payment-link";

describe("PaymentLink", () => {
	it("opens the payment modal when the upgrade button is clicked", async () => {
		const user = userEvent.setup();
		render(<PaymentLink />);

		// The modal should not be visible initially
		expect(screen.queryByTestId("payment-modal")).not.toBeInTheDocument();

		// Find and click the upgrade button
		const upgradeButton = screen.getByTestId("upgrade-button");
		await user.click(upgradeButton);

		// Now, the modal should be visible
		expect(await screen.findByTestId("payment-modal")).toBeInTheDocument();
	});
});
