import { Footer } from "@/components/footer";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";

describe("Footer", () => {
	it("renders the correct copyright text", () => {
		render(<Footer />);

		expect(screen.getByTestId("footer")).toBeInTheDocument();

		expect(screen.getByTestId("footer-copyright-text")).toBeInTheDocument();
	});
});
