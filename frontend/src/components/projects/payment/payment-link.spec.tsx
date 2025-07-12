import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentLink from "./payment-link";

describe("PaymentLink", () => {
	it("opens the payment modal when the upgrade button is clicked", async () => {
		const user = userEvent.setup();
		render(<PaymentLink />);
		expect(screen.queryByTestId("payment-modal")).not.toBeInTheDocument();
		const upgradeButton = screen.getByTestId("upgrade-button");
		await user.click(upgradeButton);
		expect(await screen.findByTestId("payment-modal")).toBeInTheDocument();
	});
});
