import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchDeepDiveStep } from "./research-deep-dive-step";

describe("ResearchDeepDiveStep", () => {
	it("renders step content", () => {
		render(<ResearchDeepDiveStep />);

		expect(screen.getByTestId("research-deep-dive-step")).toBeInTheDocument();
		expect(screen.getByTestId("research-deep-dive-header")).toBeInTheDocument();
		expect(screen.getByTestId("research-deep-dive-description")).toBeInTheDocument();
		expect(screen.getByTestId("ai-try-button")).toBeInTheDocument();

		expect(screen.getAllByTestId("app-card").length).toBeGreaterThan(0);
	});
});
