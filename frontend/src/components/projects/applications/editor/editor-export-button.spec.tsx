import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { EditorExportButton } from "./editor-export-button";

describe.sequential("EditorExportButton", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders export button", async () => {
		render(<EditorExportButton />);

		const exportButton = screen.getByTestId("editor-export-button");
		expect(exportButton).toBeInTheDocument();
	});
});
