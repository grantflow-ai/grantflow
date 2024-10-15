import { render, screen } from "@testing-library/react";
import { CreateWorkspaceModal } from "./create-workspace-modal";

describe("CreateWorkspaceModal", () => {
	it("renders the create workspace button", () => {
		render(<CreateWorkspaceModal />);

		const createButton = screen.getByTestId("create-workspace-button");
		expect(createButton).toBeInTheDocument();
	});
});
