import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, vi } from "vitest";
import { EditorSections } from "./editor-sections";

vi.mock("@grantflow/editor", () => ({
	HeadingLevels: {
		H1: 1,
		H2: 2,
		H3: 3,
	},
}));

const HeadingLevels = {
	H1: 1,
	H2: 2,
	H3: 3,
} as const;

describe.sequential("EditorSections", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders editor sections", async () => {
		render(
			<EditorSections
				onSectionClick={() => {}}
				sections={[
					{ level: HeadingLevels.H2, text: "Section 1" },
					{ level: HeadingLevels.H2, text: "Section 2" },
				]}
			/>,
		);

		const editorSections = screen.getByTestId("editor-sections");
		expect(editorSections).toBeInTheDocument();

		const editorSectionItems = screen.getAllByTestId("editor-section-item");
		expect(editorSectionItems.length).toBe(2);
	});
});
