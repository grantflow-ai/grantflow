import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { EditorContainer } from "./editor-container";

describe.sequential("EditorContainer", () => {
	afterEach(() => {
		cleanup();
	});
	it("renders all the editor page components correctly", () => {
		render(<EditorContainer />);

		expect(screen.getByTestId("editor-warning")).toBeInTheDocument();
		expect(screen.getByTestId("editor-prompt-window")).toBeInTheDocument();
		expect(screen.getByTestId("grant-application-editor")).toBeInTheDocument();
		expect(screen.getByTestId("editor-export-button")).toBeInTheDocument();
		expect(screen.getByTestId("editor-sections")).toBeInTheDocument();
	});
});
