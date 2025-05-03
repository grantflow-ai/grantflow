import { render, screen } from "@testing-library/react";

import { Logo } from "@/components/logo";

describe("Logo Component", () => {
	it("renders correctly crashing", () => {
		render(<Logo />);
		const logoElement = screen.getByTestId("logo");
		expect(logoElement).toBeInTheDocument();
	});
});
