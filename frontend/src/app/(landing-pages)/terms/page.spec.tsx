import { render, screen } from "@testing-library/react";
import TermsPage from "@/app/(landing-pages)/terms/page";

vi.mock("@/components/info-legal-page-components", () => ({
	LegalPageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
		<div data-testid="legal-container" data-title={title}>
			{children}
		</div>
	),

	TitledLegalSection: ({ clause, title }: { clause: React.ReactNode; title: string }) => (
		<div data-testid="titled-section" data-title={title}>
			{clause}
		</div>
	),
	UntitledLegalSection: ({ clause }: { clause: React.ReactNode }) => (
		<div data-testid="untitled-section">{clause}</div>
	),
}));

describe("TermsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		render(<TermsPage />);
	});

	it("renders with the correct title", () => {
		const container = screen.getByTestId("legal-container");
		expect(container).toHaveAttribute("data-title", "Terms of Use");
	});

	it("renders the welcome section as untitled", () => {
		const untitledSections = screen.getAllByTestId("untitled-section");
		expect(untitledSections[0]).toHaveTextContent("Welcome to");
		expect(untitledSections[0]).toHaveTextContent("GrantFlow.ai");
	});

	it("renders all titled sections with correct titles", () => {
		const titledSections = screen.getAllByTestId("titled-section");

		const expectedTitles = [
			"Use of the Website",
			"Early Access Sign-Up",
			"Intellectual Property",
			"Disclaimer and Limitation of Liability",
			"User Responsibility",
			"Changes to Terms",
			"Contact Information",
		];

		const actualTitles = titledSections.map((section) => section.dataset.title);

		expect(actualTitles).toEqual(expectedTitles);
	});

	it("includes contact email with correct href", () => {
		const emailLink = screen.getByText("contact@grantflow.ai");
		expect(emailLink.closest("a")).toHaveAttribute("href", "mailto:contact@grantflow.ai");
	});
});
