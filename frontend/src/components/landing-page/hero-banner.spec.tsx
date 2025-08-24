import { cleanup, render } from "@testing-library/react";

import { HeroBanner } from "./hero-banner";

vi.mock("@/hooks/use-mobile", () => ({
	useIsMobile: () => false,
}));

describe.sequential("HeroBanner", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders the component with the correct structure", () => {
		render(<HeroBanner />);

		const section = document.querySelector("section");
		expect(section).toBeInTheDocument();
	});
});
