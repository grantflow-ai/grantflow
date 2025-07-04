import { render } from "@testing-library/react";

import { HeroBanner } from "@/components/landing-page/hero-banner";

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: ()=> false,
}));

describe("HeroBanner", () => {
	it("renders the component with the correct structure", () => {
		render(<HeroBanner />);

		const section = document.querySelector("section");
		expect(section).toBeInTheDocument();
	});
});
