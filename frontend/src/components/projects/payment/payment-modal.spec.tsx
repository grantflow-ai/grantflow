import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PaymentModal from "./payment-modal";

describe("PaymentModal", () => {
	const onClose = vi.fn();

	beforeEach(() => {
		onClose.mockClear();
	});

	it("does not render when isOpen is false", () => {
		render(<PaymentModal isOpen={false} onClose={onClose} />);
		expect(screen.queryByTestId("payment-modal")).not.toBeInTheDocument();
	});

	it("renders correctly when isOpen is true", () => {
		render(<PaymentModal isOpen={true} onClose={onClose} />);
		expect(screen.getByTestId("payment-modal")).toBeInTheDocument();
	});

	it("switches between monthly and yearly tabs", async () => {
		const user = userEvent.setup();
		render(<PaymentModal isOpen={true} onClose={onClose} />);

		// Check that monthly content is visible by default
		expect(screen.getByTestId("plan-price-€200")).toBeInTheDocument();
		expect(screen.queryByTestId("plan-price-€160")).not.toBeInTheDocument();

		// Switch to the yearly tab
		const yearlyTab = screen.getByTestId("yearly-tab-trigger");
		await user.click(yearlyTab);

		// Check that yearly content is now visible and monthly content is not
		expect(await screen.findByTestId("plan-price-€160")).toBeInTheDocument();
		expect(screen.queryByTestId("plan-price-€200")).not.toBeInTheDocument();

		// Switch back to the monthly tab
		const monthlyTab = screen.getByTestId("monthly-tab-trigger");
		await user.click(monthlyTab);

		// Check that monthly content is visible again
		expect(await screen.findByTestId("plan-price-€200")).toBeInTheDocument();
		expect(screen.queryByTestId("plan-price-€160")).not.toBeInTheDocument();
	});

	it("calls onClose when the escape key is pressed", async () => {
		const user = userEvent.setup();
		render(<PaymentModal isOpen={true} onClose={onClose} />);

		await user.keyboard("{Escape}");
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
