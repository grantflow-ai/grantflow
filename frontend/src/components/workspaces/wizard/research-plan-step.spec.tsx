import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResearchPlanStep } from "./research-plan-step";

describe("ResearchPlanStep", () => {
	it("renders step content", () => {
		render(<ResearchPlanStep />);

		expect(screen.getByTestId("research-plan-step")).toBeInTheDocument();
		expect(screen.getByText("Research plan")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Define key objectives and break them into tasks. This structure is the backbone of your app.",
			),
		).toBeInTheDocument();
		expect(screen.getByText("Add First Objective")).toBeInTheDocument();
		expect(screen.getByText("Add your first research objective to get started")).toBeInTheDocument();
	});
});
