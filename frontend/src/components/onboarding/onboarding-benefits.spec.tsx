import { render, screen } from "@testing-library/react";

import { BenefitsList } from "@/components/onboarding/onboarding-benefits";

describe("BenefitsList", () => {
	it("renders the component with correct structure", () => {
		render(<BenefitsList />);

		const list = screen.getByTestId("benefits-list");
		expect(list).toBeInTheDocument();
		expect(list.tagName).toBe("UL");

		const listItems = list.querySelectorAll("li");
		expect(listItems.length).toBe(3);
	});

	it("renders IconTick components with correct props", () => {
		render(<BenefitsList />);

		const tickIcons = screen.getAllByTestId("icon-tick");
		expect(tickIcons.length).toBe(3);
	});

	it("applies custom className when provided", () => {
		render(<BenefitsList className="custom-test-class" />);

		const list = screen.getByTestId("benefits-list");
		expect(list).toHaveClass("custom-test-class");
		expect(list).toHaveClass("space-y-4");
	});
});
