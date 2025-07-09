import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PaymentPlans } from "@/components/landing-page/payment-plans/payment-plans";
import { PaymentPlansList } from "./payment-plans.constants";

describe("PaymentPlans", () => {
	it("renders the component with correct structure", () => {
		render(<PaymentPlans />);

		const mainContainer = screen.getByTestId("payment-plans");
		expect(mainContainer).toBeInTheDocument();
	});

	it("renders all payment plans from the constants", () => {
		render(<PaymentPlans />);

		const totalCards = PaymentPlansList.length;

		const paymentCards = screen.getAllByTestId("payment-plan-card");
		expect(paymentCards).toHaveLength(totalCards);
	});

	it("switches between tabs and renders the correct plans", async () => {
		const user = userEvent.setup();
		render(<PaymentPlans />);

		const [monthlyTab, yearlyTab] = [screen.getByTestId("monthly-tab"), screen.getByTestId("yearly-tab")];

		(() => {
			const prices = screen.getAllByTestId("payment-card-price-text");
			expect(prices).toHaveLength(PaymentPlansList.length);
			expect(prices[1]).toHaveTextContent(PaymentPlansList[1].pricing.monthly.priceText);
		})();

		await user.click(yearlyTab);
		(() => {
			const prices = screen.getAllByTestId("payment-card-price-text");
			expect(prices).toHaveLength(PaymentPlansList.length);
			expect(prices[1]).toHaveTextContent(PaymentPlansList[1].pricing.yearly.priceText);
		})();

		await user.click(monthlyTab);
		(() => {
			const prices = screen.getAllByTestId("payment-card-price-text");
			expect(prices).toHaveLength(PaymentPlansList.length);
			expect(prices[1]).toHaveTextContent(PaymentPlansList[1].pricing.monthly.priceText);
		})();
	});
});
