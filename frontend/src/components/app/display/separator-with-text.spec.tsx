import { cleanup, render } from "@testing-library/react";
import { afterEach } from "vitest";

import { SeparatorWithText } from "@/components/app";

describe("SeparatorWithText", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders with the provided text", () => {
		const { container } = render(<SeparatorWithText text="OR" />);

		const separator = container.querySelector('[data-testid="separator"]');
		const separatorText = container.querySelector('[data-testid="separator-text"]');

		expect(separator).toBeInTheDocument();
		expect(separatorText).toHaveTextContent("OR");
	});

	it("displays different text content", () => {
		const { container } = render(<SeparatorWithText text="Continue with" />);

		const separatorText = container.querySelector('[data-testid="separator-text"]');
		expect(separatorText).toHaveTextContent("Continue with");
	});
});
