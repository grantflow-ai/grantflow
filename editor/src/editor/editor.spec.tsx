import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { assert } from "vitest";
import { Editor, type EditorRef } from "./index";

const initialMarkdown = "# Hello World\n\nThis is a test.";
const crdtUrl = "ws://127.0.0.1:1234";
const documentId = "123";

describe("Editor", () => {
	it("renders with initial content", () => {
		render(<Editor content={initialMarkdown} crdtUrl={crdtUrl} documentId={documentId} />);

		expect(screen.getByText("Hello World")).toBeInTheDocument();
		expect(screen.getByText("This is a test.")).toBeInTheDocument();
	});

	it("returns correct markdown after editing", async () => {
		let markdownOutput: string | undefined = "";

		const Test = () => {
			const ref = useRef<EditorRef>(null);
			return (
				<>
					<Editor ref={ref} content={initialMarkdown} crdtUrl={crdtUrl} documentId={documentId} />
					<button
						type="button"
						data-testid="save-button"
						onClick={() => {
							markdownOutput = ref.current?.getMarkdown();
						}}
					>
						Save
					</button>
				</>
			);
		};
		render(<Test />);

		const textbox = screen.getByTestId("simple-editor-content").firstChild;
		assert(textbox);

		await act(async () => {
			textbox.textContent = "New content.";
			fireEvent.input(textbox, { target: { textContent: "New content." } });
			fireEvent.blur(textbox);
		});
		fireEvent.click(screen.getByTestId("save-button"));
		expect(markdownOutput).toContain("New content");
	});

	it("returns correct json after editing", async () => {
		let jsonOutput: Record<string, unknown> | undefined;

		const Test = () => {
			const ref = useRef<EditorRef>(null);
			return (
				<>
					<Editor ref={ref} content={initialMarkdown} crdtUrl={crdtUrl} documentId={documentId} />
					<button
						type="button"
						data-testid="save-button"
						onClick={() => {
							jsonOutput = ref.current?.getJSON() as Record<string, unknown>;
						}}
					>
						Save
					</button>
				</>
			);
		};
		render(<Test />);

		const textbox = screen.getByTestId("simple-editor-content").firstChild;
		assert(textbox);

		await act(async () => {
			textbox.textContent = "New content.";
			fireEvent.input(textbox, { target: { textContent: "New content." } });
			fireEvent.blur(textbox);
		});
		fireEvent.click(screen.getByTestId("save-button"));
		expect(jsonOutput).toBeTypeOf("object");
		expect(JSON.stringify(jsonOutput)).toContain("New content");
	});
});
