import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { GrantApplicationEditor } from "./grant-application-editor";

describe.sequential("GrantApplicationEditor", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders grant application editor", async () => {
		render(
			<GrantApplicationEditor
				// @ts-expect-error - mock data
				application={{ text: "hello grantflow editor" }}
			/>,
		);

		const editor = screen.getByTestId("grant-application-editor");
		expect(editor).toBeInTheDocument();
	});
});
