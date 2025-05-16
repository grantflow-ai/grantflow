import { render, screen } from "@testing-library/react";
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
} from "@/components/landing-page/icons";

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

describe("All Icon Components", () => {
	it("should render all icons without crashing", () => {
		allIcons.forEach(({ Component, name }) => {
			const { unmount } = render(<Component data-testid={`test-${name}`} />);
			expect(screen.getByTestId(`test-${name}`)).toBeInTheDocument();
			unmount();
		});
	});

	it("all icons accept and forward custom props", () => {
		allIcons.forEach(({ Component, name }) => {
			const { unmount } = render(<Component aria-label="Test icon" data-testid={`test-${name}`} role="img" />);
			const icon = screen.getByTestId(`test-${name}`);
			expect(icon).toHaveAttribute("aria-label", "Test icon");
			expect(icon).toHaveAttribute("role", "img");
			unmount();
		});
	});

	it("all icons with default size props render with correct default dimensions", () => {
		allIcons
			.filter(({ hasDefaultSize }) => hasDefaultSize)
			.forEach(({ Component, name }) => {
				const { unmount } = render(<Component data-testid={`test-${name}`} />);
				const icon = screen.getByTestId(`test-${name}`);
				expect(icon).toHaveAttribute("width", "15");
				expect(icon).toHaveAttribute("height", "15");
				unmount();
			});
	});

	it("early access benefit icons have white fill color", () => {
		const earlyAccessIcons = allIcons.filter(({ name }) => name.includes("IconEarlyAccessBenefit"));

		earlyAccessIcons.forEach(({ Component, name }) => {
			const { unmount } = render(<Component data-testid={`test-${name}`} />);
			const icon = screen.getByTestId(`test-${name}`);
			expect(icon).toHaveAttribute("fill", "#FFFFFF");
			unmount();
		});
	});
});

describe("IconBenefitFirst", () => {
	it("renders with default props", () => {
		render(<IconBenefitFirst data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconBenefitFirst className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconBenefitFirst data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconBenefitSecond", () => {
	it("renders with default props", () => {
		render(<IconBenefitSecond data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconBenefitSecond className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconBenefitSecond data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconCalendar", () => {
	it("renders with default props", () => {
		render(<IconCalendar data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom width and height", () => {
		render(<IconCalendar data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconCancel", () => {
	it("renders with default props", () => {
		render(<IconCancel data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconCancel className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconCancel data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconEarlyAccessBenefit1", () => {
	it("renders with default props", () => {
		render(<IconEarlyAccessBenefit1 data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toBeInTheDocument();
		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "24px");
		expect(icon).toHaveAttribute("height", "24px");
		expect(icon).toHaveAttribute("fill", "#FFFFFF");
	});

	it("forwards additional props", () => {
		render(<IconEarlyAccessBenefit1 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit2", () => {
	it("renders with default props", () => {
		render(<IconEarlyAccessBenefit2 data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "24px");
		expect(icon).toHaveAttribute("height", "24px");
		expect(icon).toHaveAttribute("fill", "#FFFFFF");
	});

	it("forwards additional props", () => {
		render(<IconEarlyAccessBenefit2 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit3", () => {
	it("renders with default props", () => {
		render(<IconEarlyAccessBenefit3 data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "24px");
		expect(icon).toHaveAttribute("height", "24px");
		expect(icon).toHaveAttribute("fill", "#FFFFFF");
	});

	it("forwards additional props", () => {
		render(<IconEarlyAccessBenefit3 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconEarlyAccessBenefit4", () => {
	it("renders with default props", () => {
		render(<IconEarlyAccessBenefit4 data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toBeInTheDocument();
		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "24px");
		expect(icon).toHaveAttribute("height", "24px");
		expect(icon).toHaveAttribute("fill", "#FFFFFF");
	});

	it("forwards additional props", () => {
		render(<IconEarlyAccessBenefit4 aria-label="Benefit icon" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("aria-label", "Benefit icon");
	});
});

describe("IconHamburger", () => {
	it("renders with default props", () => {
		render(<IconHamburger data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toBeInTheDocument();
		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconHamburger className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconHamburger data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});
