import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GenerateCompleteStep } from "./generate-complete-step";

describe("GenerateCompleteStep", () => {
	it("renders step content", () => {
		render(<GenerateCompleteStep />);

		expect(screen.getByTestId("generate-complete-step")).toBeInTheDocument();
		expect(screen.getByText("Generate and Complete")).toBeInTheDocument();
		expect(screen.getByText("Step 6: Finalize and complete your application")).toBeInTheDocument();
	});
});