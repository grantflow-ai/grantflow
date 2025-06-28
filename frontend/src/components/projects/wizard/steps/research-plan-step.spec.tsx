import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchPlanStep } from "./research-plan-step";

describe("ResearchPlanStep", () => {
	it("renders step content", () => {
		render(<ResearchPlanStep />);

		expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
		expect(screen.getByTestId("research-plan-header")).toBeInTheDocument();
		expect(screen.getByTestId("research-plan-description")).toBeInTheDocument();
		expect(screen.getByTestId("add-objective-button")).toBeInTheDocument();
		expect(screen.getByTestId("empty-state")).toBeInTheDocument();
	});
});
