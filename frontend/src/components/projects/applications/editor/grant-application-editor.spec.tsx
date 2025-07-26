import { ApplicationFactory } from "::testing/factories";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe } from "vitest";
import { GrantApplicationEditor } from "./grant-application-editor";

describe.sequential("GrantApplicationEditor", () => {
	afterEach(() => {
		cleanup();
	});

	it("renders grant application editor", async () => {
		const application = ApplicationFactory.build({ text: "hello grantflow editor" });
		render(
			<GrantApplicationEditor
				application={application as Parameters<typeof GrantApplicationEditor>[0]["application"]}
			/>,
		);

		const editor = screen.getByTestId("grant-application-editor");
		expect(editor).toBeInTheDocument();
	});
});
