import { render, screen } from "@testing-library/react";

import { CreateProjectModal } from "./create-project-modal";

describe("CreateProjectModal", () => {
	it("renders the create project button", () => {
		render(<CreateProjectModal />);

		const createButton = screen.getByTestId("create-project-button");
		expect(createButton).toBeInTheDocument();
	});
});
