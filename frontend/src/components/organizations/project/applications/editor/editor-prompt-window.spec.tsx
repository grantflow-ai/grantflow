import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { EditorPromptWindow } from "./editor-prompt-window";

describe.sequential("EditorPromptWindow", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders prompt window", async () => {
		render(<EditorPromptWindow />);

		const promptWindow = screen.getByTestId("editor-prompt-window");
		expect(promptWindow).toBeInTheDocument();

		const promptWindowGreeting = screen.getByTestId("editor-prompt-window-greeting");
		expect(promptWindowGreeting).toBeInTheDocument();

		const promptWindowInput = screen.getByTestId("editor-prompt-window-textarea");
		expect(promptWindowInput).toBeInTheDocument();
	});
});
