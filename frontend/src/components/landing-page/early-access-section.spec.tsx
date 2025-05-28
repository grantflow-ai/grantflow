import { render, screen } from "@testing-library/react";

import { EarlyAccessSection } from "@/components/landing-page/early-access-section";

vi.mock("motion/react", async () => {
	const actual = vi.importActual("motion/react");
	return {
		...(await actual),
		AnimatePresence: vi.fn().mockImplementation(({ children }) => children),
		motion: {
			aside: vi.fn().mockImplementation(({ children, ...props }) => <aside {...props}>{children}</aside>),
			div: vi.fn().mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
			h2: vi.fn().mockImplementation(({ children, ...props }) => <h2 {...props}>{children}</h2>),
			h3: vi.fn().mockImplementation(({ children, ...props }) => <h3 {...props}>{children}</h3>),
			li: vi.fn().mockImplementation(({ children, ...props }) => <li {...props}>{children}</li>),
			p: vi.fn().mockImplementation(({ children, ...props }) => <p {...props}>{children}</p>),
			section: vi.fn().mockImplementation(({ children, ...props }) => <section {...props}>{children}</section>),
			ul: vi.fn().mockImplementation(({ children, ...props }) => <ul {...props}>{children}</ul>),
		},
	};
});

vi.mock("./backgrounds", () => ({
	GradientBackground: vi
		.fn()
		.mockImplementation(({ className }) => (
			<div className={className} data-testid="mock-gradient-background"></div>
		)),
}));

vi.mock("./waitlist-form", () => ({
	WaitlistForm: vi.fn().mockImplementation(() => <div data-testid="mock-waitlist-form">Waitlist Form</div>),
}));

vi.mock("./icons", () => ({
	IconEarlyAccessBenefit1: vi
		.fn()
		.mockImplementation(({ className }) => <svg className={className} data-testid="icon-benefit-1" />),
	IconEarlyAccessBenefit2: vi
		.fn()
		.mockImplementation(({ className }) => <svg className={className} data-testid="icon-benefit-2" />),
	IconEarlyAccessBenefit3: vi
		.fn()
		.mockImplementation(({ className }) => <svg className={className} data-testid="icon-benefit-3" />),
	IconEarlyAccessBenefit4: vi
		.fn()
		.mockImplementation(({ className }) => <svg className={className} data-testid="icon-benefit-4" />),
}));

describe("EarlyAccessSection", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders the section with correct ID and aria label", () => {
		render(<EarlyAccessSection />);
		const section = screen.getByLabelText("early-access-section");
		expect(section).toBeInTheDocument();
		expect(section.id).toBe("waitlist");
	});

	it("renders the badge with correct text", () => {
		render(<EarlyAccessSection />);
		const badge = screen.getByText("Early Access Registration Now Open!");
		expect(badge).toBeInTheDocument();
		expect(badge.id).toBe("early-access-badge");
	});

	it("renders the heading and description", () => {
		render(<EarlyAccessSection />);
		const heading = screen.getByTestId("early-access-heading");
		const description = screen.getByTestId("early-access-description");

		expect(heading).toBeInTheDocument();
		expect(description).toBeInTheDocument();
		expect(heading.id).toBe("early-access-heading");
		expect(description.id).toBe("early-access-description");
	});

	it("renders all benefit cards with correct content", () => {
		render(<EarlyAccessSection />);

		expect(screen.getByText("Exclusive Features")).toBeInTheDocument();
		expect(screen.getByText("Influence the Future")).toBeInTheDocument();
		expect(screen.getByText("Priority Support")).toBeInTheDocument();
		expect(screen.getByText("Free Application")).toBeInTheDocument();

		expect(screen.getByText(/Be the first to explore our most advanced/)).toBeInTheDocument();
		expect(screen.getByText(/Your feedback will directly shape/)).toBeInTheDocument();
		expect(screen.getByText(/Get dedicated onboarding and hands-on assistance/)).toBeInTheDocument();
		expect(screen.getByText(/Create and generate your first full grant application/)).toBeInTheDocument();

		expect(screen.getByTestId("icon-benefit-1")).toBeInTheDocument();
		expect(screen.getByTestId("icon-benefit-2")).toBeInTheDocument();
		expect(screen.getByTestId("icon-benefit-3")).toBeInTheDocument();
		expect(screen.getByTestId("icon-benefit-4")).toBeInTheDocument();
	});

	it("renders gradient backgrounds", () => {
		render(<EarlyAccessSection />);
		const backgrounds = screen.getAllByTestId("mock-gradient-background");
		expect(backgrounds.length).toBe(2);
	});
});
