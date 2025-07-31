import { HeadingLevels } from "@grantflow/editor";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { EditorSections } from "./editor-sections";

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
