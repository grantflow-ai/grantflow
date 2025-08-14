import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe } from "vitest";
import { EditorWarning } from "./editor-warning";

describe.sequential("EditorWarning", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders editor warning and hides on close", async () => {
		const user = userEvent.setup();
		render(<EditorWarning />);

		const editorWarning = screen.getByTestId("editor-warning");
		expect(editorWarning).toBeInTheDocument();

		const closeButton = screen.getByTestId("editor-warning-close");
		expect(closeButton).toBeInTheDocument();

		await user.click(closeButton);

		expect(editorWarning).not.toBeInTheDocument();
	});
});
