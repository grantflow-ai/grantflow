import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GenerateCompleteStep } from "./generate-complete-step";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
	}),
}));

afterEach(() => {
	cleanup();
});

describe.sequential("GenerateCompleteStep", () => {
	it("renders static congratulations content", () => {
		const { container } = render(<GenerateCompleteStep />);

		expect(container.querySelector('[data-testid="generate-complete-step"]')).toBeInTheDocument();
		expect(screen.getByText("Great job! Your Application Draft Is Being Generated")).toBeInTheDocument();
		expect(
			screen.getByText("We're now generating your draft and will send it to your inbox shortly."),
		).toBeInTheDocument();

		expect(container.querySelector("button")).not.toBeInTheDocument();
	});

	it("renders the logo image", () => {
		render(<GenerateCompleteStep />);

		const logo = screen.getByAltText("GrantFlow logo");
		expect(logo).toBeInTheDocument();
		expect(logo).toHaveAttribute("src", "/icons/preview-logo.svg");
	});
});
