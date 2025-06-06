import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchPlanStep } from "./research-plan-step";

describe("ResearchPlanStep", () => {
	it("renders step content", () => {
		render(<ResearchPlanStep />);

		expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
		expect(screen.getByText("Research Plan")).toBeInTheDocument();
		expect(screen.getByText("Step 4: Define your research plan")).toBeInTheDocument();
	});
});
