import { render, screen } from "@testing-library/react";
import { IconDraft, IconHourglass, IconOrganize, IconRefine } from "@/components/about/icons";

const allIcons = [
	{ Component: IconDraft, name: "IconDraft" },
	{ Component: IconHourglass, name: "IconHourglass" },
	{ Component: IconOrganize, name: "IconOrganize" },
	{ Component: IconRefine, name: "IconRefine" },
];

describe("All About Icons", () => {
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

	it("all icons render with correct default dimensions", () => {
		allIcons.forEach(({ Component, name }) => {
			const { unmount } = render(<Component data-testid={`test-${name}`} />);
			const icon = screen.getByTestId(`test-${name}`);
			expect(icon).toHaveAttribute("width", "15");
			expect(icon).toHaveAttribute("height", "15");
			unmount();
		});
	});
});

describe("IconDraft", () => {
	it("renders with default props", () => {
		render(<IconDraft data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconDraft className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconDraft data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconHourglass", () => {
	it("renders with default props", () => {
		render(<IconHourglass data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconHourglass className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconHourglass data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconOrganize", () => {
	it("renders with default props", () => {
		render(<IconOrganize data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconOrganize className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconOrganize data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe("IconRefine", () => {
	it("renders with default props", () => {
		render(<IconRefine data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		render(<IconRefine className="custom-class" data-testid="test-icon" />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		render(<IconRefine data-testid="test-icon" height={40} width={30} />);
		const icon = screen.getByTestId("test-icon");

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});
