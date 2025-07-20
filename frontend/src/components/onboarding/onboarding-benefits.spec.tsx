import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { BenefitsList } from "@/components/onboarding/onboarding-benefits";

afterEach(() => {
	cleanup();
});

describe("BenefitsList", () => {
	it("renders the component with correct structure", () => {
		const { container } = render(<BenefitsList />);

		const list = container.querySelector('[data-testid="benefits-list"]');
		expect(list).toBeInTheDocument();
		expect(list?.tagName).toBe("UL");

		const listItems = list?.querySelectorAll("li");
		expect(listItems?.length).toBe(3);
	});

	it("renders IconTick components with correct props", () => {
		const { container } = render(<BenefitsList />);

		const tickIcons = container.querySelectorAll('[data-testid="icon-tick"]');
		expect(tickIcons.length).toBe(3);
	});

	it("applies custom className when provided", () => {
		const { container } = render(<BenefitsList className="custom-test-class" />);

		const list = container.querySelector('[data-testid="benefits-list"]');
		expect(list).toHaveClass("custom-test-class");
		expect(list).toHaveClass("space-y-4");
	});
});
