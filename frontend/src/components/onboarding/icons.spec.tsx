import { cleanup, render } from "@testing-library/react";

import { IconSocialGoogle, IconSocialOrcid, IconTick } from "@/components/onboarding/icons";

describe("Social Icon Components", () => {
	afterEach(() => {
		cleanup();
	});
	describe("IconSocialGoogle", () => {
		it("renders with default props", () => {
			const { container } = render(<IconSocialGoogle data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon?.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "15");
			expect(icon).toHaveAttribute("height", "15");
		});

		it("applies custom className", () => {
			const { container } = render(<IconSocialGoogle className="custom-class" data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			const { container } = render(<IconSocialGoogle data-testid="test-icon" height={40} width={30} />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			const { container } = render(
				<IconSocialGoogle aria-label="Google icon" data-testid="test-icon" role="img" />,
			);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("aria-label", "Google icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});

	describe("IconSocialOrcid", () => {
		it("renders with default props", () => {
			const { container } = render(<IconSocialOrcid data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon?.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "15");
			expect(icon).toHaveAttribute("height", "15");
		});

		it("applies custom className", () => {
			const { container } = render(<IconSocialOrcid className="custom-class" data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			const { container } = render(<IconSocialOrcid data-testid="test-icon" height={40} width={30} />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			const { container } = render(
				<IconSocialOrcid aria-label="ORCID icon" data-testid="test-icon" role="img" />,
			);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("aria-label", "ORCID icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});

	describe("IconTick", () => {
		it("renders with default props", () => {
			const { container } = render(<IconTick data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon?.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "14");
			expect(icon).toHaveAttribute("height", "14");
		});

		it("applies custom className", () => {
			const { container } = render(<IconTick className="custom-class" data-testid="test-icon" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			const { container } = render(<IconTick data-testid="test-icon" height={40} width={30} />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			const { container } = render(<IconTick aria-label="Tick icon" data-testid="test-icon" role="img" />);
			const icon = container.querySelector('[data-testid="test-icon"]');

			expect(icon).toHaveAttribute("aria-label", "Tick icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});
});
