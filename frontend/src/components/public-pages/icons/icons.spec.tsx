import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";

import { IconDraft, IconHourglass, IconOrganize, IconRefine } from "@/components/public-pages";

const allIcons = [
	{ Component: IconDraft, name: "IconDraft" },
	{ Component: IconHourglass, name: "IconHourglass" },
	{ Component: IconOrganize, name: "IconOrganize" },
	{ Component: IconRefine, name: "IconRefine" },
];

afterEach(() => {
	cleanup();
});

describe.sequential("All About Icons", () => {
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

describe.sequential("IconDraft", () => {
	it("renders with default props", () => {
		const { container } = render(<IconDraft data-testid="icon-draft-default" />);
		const icon = container.querySelector('[data-testid="icon-draft-default"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconDraft className="custom-class" data-testid="icon-draft-class" />);
		const icon = container.querySelector('[data-testid="icon-draft-class"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconDraft data-testid="icon-draft-dimensions" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="icon-draft-dimensions"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe.sequential("IconHourglass", () => {
	it("renders with default props", () => {
		const { container } = render(<IconHourglass data-testid="icon-hourglass-default" />);
		const icon = container.querySelector('[data-testid="icon-hourglass-default"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconHourglass className="custom-class" data-testid="icon-hourglass-class" />);
		const icon = container.querySelector('[data-testid="icon-hourglass-class"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconHourglass data-testid="icon-hourglass-dimensions" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="icon-hourglass-dimensions"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe.sequential("IconOrganize", () => {
	it("renders with default props", () => {
		const { container } = render(<IconOrganize data-testid="icon-organize-default" />);
		const icon = container.querySelector('[data-testid="icon-organize-default"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconOrganize className="custom-class" data-testid="icon-organize-class" />);
		const icon = container.querySelector('[data-testid="icon-organize-class"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconOrganize data-testid="icon-organize-dimensions" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="icon-organize-dimensions"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});

describe.sequential("IconRefine", () => {
	it("renders with default props", () => {
		const { container } = render(<IconRefine data-testid="icon-refine-default" />);
		const icon = container.querySelector('[data-testid="icon-refine-default"]');

		expect(icon?.tagName).toBe("svg");
		expect(icon).toHaveAttribute("width", "15");
		expect(icon).toHaveAttribute("height", "15");
		expect(icon).toHaveAttribute("fill", "currentColor");
	});

	it("applies custom className", () => {
		const { container } = render(<IconRefine className="custom-class" data-testid="icon-refine-class" />);
		const icon = container.querySelector('[data-testid="icon-refine-class"]');

		expect(icon).toHaveClass("custom-class");
	});

	it("applies custom width and height", () => {
		const { container } = render(<IconRefine data-testid="icon-refine-dimensions" height={40} width={30} />);
		const icon = container.querySelector('[data-testid="icon-refine-dimensions"]');

		expect(icon).toHaveAttribute("width", "30");
		expect(icon).toHaveAttribute("height", "40");
	});
});
