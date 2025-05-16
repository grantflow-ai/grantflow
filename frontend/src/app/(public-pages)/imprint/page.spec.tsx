import { render, screen } from "@testing-library/react";
import ImprintPage from "@/app/(public-pages)/imprint/page";
import { vi } from "vitest";

vi.mock("@/components/info-legal-page-components", () => ({
	LegalPageContainer: ({ children, title }: { children: React.ReactNode; title: string }) => (
		<div data-testid="legal-container" data-title={title}>
			{children}
		</div>
	),
}));

describe("ImprintPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		render(<ImprintPage />);
	});

	it("renders with the correct title", () => {
		const container = screen.getByTestId("legal-container");
		expect(container).toHaveAttribute("data-title", "Imprint");
	});

	it("displays company contact information", () => {
		expect(screen.getByText(/Na'aman Hirschfeld/)).toBeInTheDocument();
		expect(screen.getByText(/Boppstr\. 2/)).toBeInTheDocument();
		expect(screen.getByText(/10967 Berlin, Germany/)).toBeInTheDocument();
	});

	it("includes contact email with correct href", () => {
		const emailLink = screen.getByText("contact@grantflow.ai");
		expect(emailLink.closest("a")).toHaveAttribute("href", "mailto:contact@grantflow.ai");
	});

	it("displays development status information", () => {
		expect(screen.getByText(/GrantFlow\.ai is currently in development/)).toBeInTheDocument();
	});
});
