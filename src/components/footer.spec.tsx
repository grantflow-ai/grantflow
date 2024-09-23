import { Footer } from "@/components/footer";
import en from "@/localisations/en.json";
import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";

describe("Footer", () => {
	it("renders the correct copyright text", () => {
		render(<Footer locales={en} />);

		expect(screen.getByTestId("footer")).toBeInTheDocument();

		expect(screen.getByTestId("footer-copyright-text")).toHaveTextContent(en.footer.copyRightText);
	});
});
