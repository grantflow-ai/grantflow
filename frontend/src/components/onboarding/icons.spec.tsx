import { render, screen } from "@testing-library/react";

import { IconSocialGoogle, IconSocialOrcid, IconTick } from "@/components/onboarding/icons";

describe("Social Icon Components", () => {
	describe("IconSocialGoogle", () => {
		it("renders with default props", () => {
			render(<IconSocialGoogle data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "15");
			expect(icon).toHaveAttribute("height", "15");
		});

		it("applies custom className", () => {
			render(<IconSocialGoogle className="custom-class" data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			render(<IconSocialGoogle data-testid="test-icon" height={40} width={30} />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			render(<IconSocialGoogle aria-label="Google icon" data-testid="test-icon" role="img" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("aria-label", "Google icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});

	describe("IconSocialOrcid", () => {
		it("renders with default props", () => {
			render(<IconSocialOrcid data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "15");
			expect(icon).toHaveAttribute("height", "15");
		});

		it("applies custom className", () => {
			render(<IconSocialOrcid className="custom-class" data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			render(<IconSocialOrcid data-testid="test-icon" height={40} width={30} />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			render(<IconSocialOrcid aria-label="ORCID icon" data-testid="test-icon" role="img" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("aria-label", "ORCID icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});

	describe("IconTick", () => {
		it("renders with default props", () => {
			render(<IconTick data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon.tagName).toBe("svg");
			expect(icon).toHaveAttribute("width", "14");
			expect(icon).toHaveAttribute("height", "14");
		});

		it("applies custom className", () => {
			render(<IconTick className="custom-class" data-testid="test-icon" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveClass("custom-class");
		});

		it("applies custom width and height", () => {
			render(<IconTick data-testid="test-icon" height={40} width={30} />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("width", "30");
			expect(icon).toHaveAttribute("height", "40");
		});

		it("forwards additional props", () => {
			render(<IconTick aria-label="Tick icon" data-testid="test-icon" role="img" />);
			const icon = screen.getByTestId("test-icon");

			expect(icon).toHaveAttribute("aria-label", "Tick icon");
			expect(icon).toHaveAttribute("role", "img");
		});
	});
});
