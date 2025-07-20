import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GenerateCompleteStep } from "@/components/projects";

afterEach(() => {
	cleanup();
});

describe.sequential("GenerateCompleteStep", () => {
	it("renders step content", () => {
		const { container } = render(<GenerateCompleteStep />);

		expect(container.querySelector('[data-testid="generate-complete-step"]')).toBeInTheDocument();
		expect(screen.getByText("Generate and Complete")).toBeInTheDocument();
		expect(screen.getByText("Ready to Generate")).toBeInTheDocument();
		expect(container.querySelector('[data-testid="generate-application-button"]')).toBeInTheDocument();
	});
});
