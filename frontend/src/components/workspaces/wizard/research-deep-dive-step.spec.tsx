import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchDeepDiveStep } from "./research-deep-dive-step";

describe("ResearchDeepDiveStep", () => {
	it("renders step content", () => {
		render(<ResearchDeepDiveStep />);

		expect(screen.getByTestId("research-deep-dive-step")).toBeInTheDocument();
		expect(screen.getByText("Research Deep Dive")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Conduct comprehensive research to strengthen your grant application with evidence-based insights.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Let the AI try")).toBeInTheDocument();
		expect(screen.getByText("Start your research deep dive to see analysis and insights")).toBeInTheDocument();
	});
});
