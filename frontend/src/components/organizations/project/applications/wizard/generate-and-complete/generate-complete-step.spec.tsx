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
	it("renders the progress bar and generating text when progress is incomplete", () => {
		render(<GenerateCompleteStep progress={50} />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
		expect(screen.getByText("Great job! Your Application Draft Is Being Generated")).toBeInTheDocument();
		expect(
			screen.getByText(
				"We’re preparing your draft. You’ll be able to download it here, and we’ll also send a copy to your inbox shortly.",
			),
		).toBeInTheDocument();
	});

	it("renders the progress bar and ready text when progress is complete", () => {
		render(<GenerateCompleteStep progress={100} />);

		expect(screen.getByRole("progressbar")).toBeInTheDocument();
		expect(screen.getByText("Your Application Draft Is Ready")).toBeInTheDocument();
		expect(
			screen.getByText(
				"You can download it directly here. We’ve also sent a copy to your inbox for your convenience.",
			),
		).toBeInTheDocument();
	});
});
