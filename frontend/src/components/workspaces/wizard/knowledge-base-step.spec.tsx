import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KnowledgeBaseStep } from "./knowledge-base-step";

describe("KnowledgeBaseStep", () => {
	it("renders step content", () => {
		render(<KnowledgeBaseStep />);

		expect(screen.getByTestId("knowledge-base-step")).toBeInTheDocument();
		expect(screen.getByText("Knowledge Base")).toBeInTheDocument();
		expect(screen.getByText("Step 3: Set up your knowledge base")).toBeInTheDocument();
	});
});
