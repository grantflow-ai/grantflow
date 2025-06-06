import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ApplicationStructureStep } from "./application-structure-step";

describe("ApplicationStructureStep", () => {
	it("renders step content", () => {
		render(<ApplicationStructureStep />);

		expect(screen.getByTestId("application-structure-step")).toBeInTheDocument();
		expect(screen.getByText("Preview and Approve")).toBeInTheDocument();
		expect(screen.getByText("Step 2: Review and approve your application")).toBeInTheDocument();
	});
});
