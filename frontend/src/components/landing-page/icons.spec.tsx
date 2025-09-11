import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import {
	IconBenefitFirst,
	IconBenefitSecond,
	IconCalendar,
	IconCancel,
	IconEarlyAccessBenefit1,
	IconEarlyAccessBenefit2,
	IconEarlyAccessBenefit3,
	IconEarlyAccessBenefit4,
	IconHamburger,
} from "./icons";

const allIcons = [
	{ Component: IconBenefitFirst, hasDefaultSize: true, name: "IconBenefitFirst" },
	{ Component: IconBenefitSecond, hasDefaultSize: true, name: "IconBenefitSecond" },
	{ Component: IconCalendar, hasDefaultSize: true, name: "IconCalendar" },
	{ Component: IconCancel, hasDefaultSize: true, name: "IconCancel" },
	{ Component: IconEarlyAccessBenefit1, hasDefaultSize: false, name: "IconEarlyAccessBenefit1" },
	{ Component: IconEarlyAccessBenefit2, hasDefaultSize: false, name: "IconEarlyAccessBenefit2" },
	{ Component: IconEarlyAccessBenefit3, hasDefaultSize: false, name: "IconEarlyAccessBenefit3" },
	{ Component: IconEarlyAccessBenefit4, hasDefaultSize: false, name: "IconEarlyAccessBenefit4" },
	{ Component: IconHamburger, hasDefaultSize: true, name: "IconHamburger" },
];

afterEach(() => {
	cleanup();
});

describe.sequential("All Icon Components", () => {
	it("should render all icons without crashing", () => {
		allIcons.forEach(({ Component, name }) => {
			const { container, unmount } = render(<Component data-testid={`test-${name}`} />);
			const icon = container.querySelector(`[data-testid="test-${name}"]`);
			expect(icon).toBeInTheDocument();
			unmount();
		});
	});

	it("all icons accept and forward custom props", () => {
		allIcons.forEach(({ Component, name }) => {
			const { container, unmount } = render(
				<Component aria-label="Test icon" data-testid={`test-${name}`} role="img" />,
			);
			const icon = container.querySelector(`[data-testid="test-${name}"]`);
			expect(icon).toHaveAttribute("aria-label", "Test icon");
			expect(icon).toHaveAttribute("role", "img");
			unmount();
		});
	});

	it("all icons with default size props render with correct default dimensions", () => {
		allIcons
			.filter(({ hasDefaultSize }) => hasDefaultSize)
			.forEach(({ Component, name }) => {
				const { container, unmount } = render(<Component data-testid={`test-${name}`} />);
				const icon = container.querySelector(`[data-testid="test-${name}"]`);
				expect(icon).toHaveAttribute("width", "15");
				expect(icon).toHaveAttribute("height", "15");
				unmount();
			});
	});
});

describe("IconBenefitFirst", () => {
	it("renders with default props", () => {
		const { container } = render(<IconBenefitFirst data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconBenefitFirst className="custom-class" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconBenefitFirst data-testid="test-icon" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconBenefitSecond", () => {
	it("renders with default props", () => {
		const { container } = render(<IconBenefitSecond data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconBenefitSecond className="custom-class" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconBenefitSecond data-testid="test-icon" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconCalendar", () => {
	it("renders with default props", () => {
		const { container } = render(<IconCalendar data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconCalendar data-testid="test-icon" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconCancel", () => {
	it("renders with default props", () => {
		const { container } = render(<IconCancel data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconCancel className="custom-class" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconCancel data-testid="test-icon" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconEarlyAccessBenefit1", () => {
	it("renders with default props", () => {
		const { container } = render(<IconEarlyAccessBenefit1 data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toBeInTheDocument();
		expect(icon?.tagName).toBe("svg");
	});

	it("forwards additional props", () => {
		const { container } = render(<IconEarlyAccessBenefit1 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit2", () => {
	it("renders with default props", () => {
		const { container } = render(<IconEarlyAccessBenefit2 data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
	});

	it("forwards additional props", () => {
		const { container } = render(<IconEarlyAccessBenefit2 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit3", () => {
	it("renders with default props", () => {
		const { container } = render(<IconEarlyAccessBenefit3 data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon?.tagName).toBe("svg");
	});

	it("forwards additional props", () => {
		const { container } = render(<IconEarlyAccessBenefit3 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit4", () => {
	it("renders with default props", () => {
		const { container } = render(<IconEarlyAccessBenefit4 data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toBeInTheDocument();
		expect(icon?.tagName).toBe("svg");
	});

	it("forwards additional props", () => {
		const { container } = render(<IconEarlyAccessBenefit4 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconHamburger", () => {
	it("renders with default props", () => {
		const { container } = render(<IconHamburger data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toBeInTheDocument();
		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconHamburger className="custom-class" data-testid="test-icon" />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconHamburger data-testid="test-icon" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="test-icon"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});
