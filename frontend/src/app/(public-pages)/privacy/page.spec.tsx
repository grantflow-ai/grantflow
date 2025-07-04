import { render, screen } from "@testing-library/react";

import PrivacyPolicyPage from "@/app/(public-pages)/privacy/page";

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: ()=> false,
}));

vi.mock("@/components/shared/info-legal-page-components", () => ({
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

describe("PrivacyPolicyPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		render(<PrivacyPolicyPage />);
	});

	it("renders with the correct title", () => {
		const container = screen.getByTestId("legal-container");
		expect(container).toHaveAttribute("data-title", "Privacy Policy");
	});

	it("renders introduction section as untitled", () => {
		const untitledSections = screen.getAllByTestId("untitled-section");
		expect(untitledSections[0]).toHaveTextContent("Your privacy is important");
	});

	it("renders important privacy sections", () => {
		const titledSections = screen.getAllByTestId("titled-section");
		const sectionTitles = titledSections.map((s) => s.dataset.title);

		expect(sectionTitles).toContain("Information We Collect");
		expect(sectionTitles).toContain("Use of Your Information");
		expect(sectionTitles).toContain("No Model Training on User Data");
		expect(sectionTitles).toContain("Your Rights");
	});

	it("includes all contact information with email links", () => {
		const emailLinks = screen.getAllByText("contact@grantflow.ai");
		expect(emailLinks.length).toBe(2);

		emailLinks.forEach((link) => {
			expect(link.closest("a")).toHaveAttribute("href", "mailto:contact@grantflow.ai");
		});
	});
});
